-- ============================================================
-- MTSPC26 - Plateforme Logistique Humanitaire - Région Béni Mellal-Khénifra
-- Schéma PostgreSQL v1.0
-- ============================================================

-- Activer l'extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE : entrepots
-- Gérée par : SUPER_ADMIN (création), ADMIN_ENTREPOT (consultation)
-- ============================================================
CREATE TABLE entrepots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20)  NOT NULL UNIQUE,          -- ex: ENT-KHN-01
    nom             VARCHAR(150) NOT NULL,                  -- ex: Entrepôt Provincial de Khénifra
    wilaya          VARCHAR(100) NOT NULL,
    province        VARCHAR(100),
    adresse         TEXT,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    capacite_m3     INTEGER,                               -- Capacité volumique
    statut          VARCHAR(20)  NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'inactif', 'surcharge')),
    keycloak_admin_id VARCHAR(36),                         -- UUID du compte Keycloak de l'admin responsable
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : materiels
-- "Master Data" — Gérée par : ADMIN_ENTREPOT de l'entrepôt concerné
-- ============================================================
CREATE TABLE materiels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference       VARCHAR(50)  NOT NULL UNIQUE,          -- ex: MAT-TENTE-3P
    nom             VARCHAR(200) NOT NULL,
    categorie       VARCHAR(30)  NOT NULL
                        CHECK (categorie IN (
                            'TENTE', 'EAU', 'MEDICAMENT',
                            'NOURRITURE', 'EQUIPEMENT', 'AUTRE'
                        )),
    sous_categorie  VARCHAR(100),                          -- ex: "Antibiotiques", "Eau potable 5L"
    unite           VARCHAR(30)  NOT NULL DEFAULT 'unité', -- ex: unité, litre, kg, boîte
    description     TEXT,
    entrepot_id     UUID NOT NULL REFERENCES entrepots(id) ON DELETE RESTRICT,
    created_by      VARCHAR(36)  NOT NULL,                 -- keycloak_user_id de l'admin
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : stocks
-- Quantités disponibles par entrepôt et par matériel
-- Mise à jour lors de la création et complétion des missions
-- ============================================================
CREATE TABLE stocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrepot_id     UUID         NOT NULL REFERENCES entrepots(id) ON DELETE RESTRICT,
    materiel_id     UUID         NOT NULL REFERENCES materiels(id) ON DELETE RESTRICT,
    quantite        INTEGER      NOT NULL DEFAULT 0 CHECK (quantite >= 0),
    seuil_alerte    INTEGER      NOT NULL DEFAULT 10,      -- Déclenche une alerte vers le Super-Admin
    derniere_entree TIMESTAMPTZ,
    derniere_sortie TIMESTAMPTZ,
    updated_by      VARCHAR(36)  NOT NULL,                 -- keycloak_user_id
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (entrepot_id, materiel_id)
);

-- ============================================================
-- TABLE : distributeurs
-- Profils terrain — Créés par ADMIN_ENTREPOT, authentifiés via Keycloak
-- ============================================================
CREATE TABLE distributeurs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_user_id    VARCHAR(36)  NOT NULL UNIQUE,      -- UUID du compte Keycloak
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    telephone           VARCHAR(20),
    email               VARCHAR(150),
    entrepot_id         UUID NOT NULL REFERENCES entrepots(id) ON DELETE RESTRICT,
    statut              VARCHAR(20)  NOT NULL DEFAULT 'disponible'
                            CHECK (statut IN ('disponible', 'en_mission', 'inactif')),
    derniere_connexion  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : missions_livraison
-- Cœur opérationnel — Créées par ADMIN_ENTREPOT, exécutées par DISTRIBUTEUR
-- ============================================================
CREATE TABLE missions_livraison (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_mission      VARCHAR(30)  NOT NULL UNIQUE,      -- ex: MSN-2024-00042
    entrepot_source_id  UUID         NOT NULL REFERENCES entrepots(id) ON DELETE RESTRICT,
    distributeur_id     UUID         REFERENCES distributeurs(id) ON DELETE SET NULL,
    destination_nom     VARCHAR(200) NOT NULL,             -- ex: Douar Tizgui - Azilal
    destination_adresse TEXT,
    destination_lat     DECIMAL(10, 7),
    destination_lng     DECIMAL(10, 7),
    statut              VARCHAR(20)  NOT NULL DEFAULT 'draft'
                            CHECK (statut IN ('draft', 'pending', 'in_progress', 'completed', 'annulee')),
    priorite            VARCHAR(10)  NOT NULL DEFAULT 'medium'
                            CHECK (priorite IN ('low', 'medium', 'high', 'critique')),
    date_echeance       TIMESTAMPTZ,
    notes               TEXT,
    preuve_photo_url    TEXT,
    signature_url       TEXT,
    commentaire_terrain TEXT,
    livraison_lat       DECIMAL(10, 7),
    livraison_lng       DECIMAL(10, 7),
    created_by          VARCHAR(36)  NOT NULL,             
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ
);

-- ============================================================
-- TABLE : mission_items
-- Détail du matériel embarqué dans chaque mission
-- ============================================================
CREATE TABLE mission_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id          UUID    NOT NULL REFERENCES missions_livraison(id) ON DELETE CASCADE,
    materiel_id         UUID    NOT NULL REFERENCES materiels(id) ON DELETE RESTRICT,
    quantite_prevue     INTEGER NOT NULL CHECK (quantite_prevue > 0),
    quantite_livree     INTEGER          CHECK (quantite_livree >= 0),
    notes               TEXT,
    UNIQUE (mission_id, materiel_id)
);

-- ============================================================
-- TABLE : audit_logs  *** TABLE IMMUABLE ***
-- ============================================================
CREATE TABLE audit_logs (
    id              BIGSERIAL    PRIMARY KEY,
    table_cible     VARCHAR(100) NOT NULL,
    operation       VARCHAR(10)  NOT NULL
                        CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id       TEXT         NOT NULL,
    valeurs_avant   JSONB,
    valeurs_apres   JSONB,
    acteur_user_id  VARCHAR(36)  NOT NULL,
    acteur_role     VARCHAR(30)  NOT NULL,
    acteur_email    VARCHAR(150),
    entrepot_id     UUID         REFERENCES entrepots(id) ON DELETE SET NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : alertes_stock
-- ============================================================
CREATE TABLE alertes_stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id        UUID         NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    entrepot_id     UUID         NOT NULL REFERENCES entrepots(id) ON DELETE CASCADE,
    materiel_id     UUID         NOT NULL REFERENCES materiels(id) ON DELETE CASCADE,
    quantite_alerte INTEGER      NOT NULL,
    message         TEXT,
    traitee         BOOLEAN      NOT NULL DEFAULT FALSE,
    traitee_par     VARCHAR(36),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    traitee_at      TIMESTAMPTZ
);

-- ============================================================
-- SÉCURITÉ DE LA TABLE AUDIT_LOGS : RENDRE IMMUABLE
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        '[SECURITE MTSPC26] La table audit_logs est IMMUABLE. Opération % interdite. Toute tentative est elle-même auditée.',
        TG_OP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================
-- DONNÉES DE RÉFÉRENCE (SEED) — Pour la démo jury
-- ============================================================
INSERT INTO entrepots (code, nom, wilaya, province, adresse, latitude, longitude, capacite_m3, statut) VALUES
    ('ENT-KHN-01', 'Entrepôt Provincial de Khénifra',    'Béni Mellal-Khénifra', 'Khénifra',    'Route nationale N8, Khénifra',     32.9436, -5.6686, 2000, 'actif'),
    ('ENT-BML-01', 'Entrepôt Régional de Béni Mellal',   'Béni Mellal-Khénifra', 'Béni Mellal', 'Av. Hassan II, Béni Mellal',       32.3372, -6.3498, 5000, 'actif'),
    ('ENT-AZL-01', 'Entrepôt Provincial d''Azilal',      'Béni Mellal-Khénifra', 'Azilal',      'Route provinciale RP1702, Azilal', 31.9670, -6.5728, 1500, 'actif');


-- ============================================================
-- SEED : DISTRIBUTEURS (comptes terrain)
-- keycloak_user_id = UUID à copier dans Keycloak après création
--   des comptes (Keycloak > Users > l'utilisateur > Attributes)
-- ============================================================
INSERT INTO distributeurs
    (keycloak_user_id, nom, prenom, telephone, email, entrepot_id, statut)
VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Amalou', 'Youssef',
        '+212661234567', 'y.amalou@logistique.ma',
        (SELECT id FROM entrepots WHERE code = 'ENT-AZL-01'),
        'en_mission'
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'Benali', 'Rachid',
        '+212662345678', 'r.benali@logistique.ma',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        'en_mission'
    ),
    (
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        'Ouali', 'Fatima Ezzahra',
        '+212663456789', 'f.ouali@logistique.ma',
        (SELECT id FROM entrepots WHERE code = 'ENT-KHN-01'),
        'disponible'
    ),
    (
        'd4e5f6a7-b8c9-0123-def0-234567890123',
        'Bourass', 'Hassan',
        '+212664567890', 'h.bourass@logistique.ma',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        'disponible'
    );


-- ============================================================
-- SEED : MATERIELS
-- admin_id fictif = 00000000-0000-0000-0000-000000000001
-- (remplacer par le vrai keycloak_user_id de l'ADMIN_ENTREPOT)
-- ============================================================

-- Entrepot Regional de Beni Mellal
INSERT INTO materiels
    (reference, nom, categorie, sous_categorie, unite, description, entrepot_id, created_by)
VALUES
    (
        'MAT-TENTE-BML-3P',
        'Tente Familiale Impermeable 3 Places',
        'TENTE', 'Abri urgence',
        'unite',
        'Tente tunnel double paroi, impermeabilite 3000mm, sol cousu, armatures fibre de verre. Montage 10 min.',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-EAU-OULMES-15L',
        'Pack Eau Minerale Oulmes 1,5L (lot de 12 bouteilles)',
        'EAU', 'Eau potable embouteillee',
        'lot',
        'Eau minerale naturelle Oulmes, 12 bouteilles 1,5L par lot. Certifiee ONSSA.',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-KIT-MED-URG',
        'Kit Medical d''Urgence Polyvalent',
        'MEDICAMENT', 'Premiers secours',
        'kit',
        'Contient : bandages steriles, antiseptique, serum physiologique, compresses, gants latex. Conforme MSP.',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-COLIS-SURV-7J',
        'Colis Alimentaire de Survie 7 Jours (1 famille)',
        'NOURRITURE', 'Ration urgence',
        'colis',
        'Farine, sucre, huile, conserves, the, sel. Ration pour famille de 5 personnes pendant 7 jours.',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-COUV-LAINE-200',
        'Couverture Laine Epaisse 200x150cm',
        'EQUIPEMENT', 'Literie urgence',
        'unite',
        'Couverture 100% laine vierge, grammage 700g/m2, resistance jusqu''a -10 degres C. Coloris olive.',
        (SELECT id FROM entrepots WHERE code = 'ENT-BML-01'),
        '00000000-0000-0000-0000-000000000001'
    );

-- Entrepot Provincial de Khenifra
INSERT INTO materiels
    (reference, nom, categorie, sous_categorie, unite, description, entrepot_id, created_by)
VALUES
    (
        'MAT-TENTE-KHN-6P',
        'Tente Militaire Impermeable 6 Places',
        'TENTE', 'Abri collectif',
        'unite',
        'Tente frame camping militaire, impermeabilite 5000mm. Adaptee terrain montagneux.',
        (SELECT id FROM entrepots WHERE code = 'ENT-KHN-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-EAU-BIDON-20L',
        'Eau Potable Bidon 20L (certifiee OMS)',
        'EAU', 'Eau potable en bidon',
        'bidon',
        'Bidon HDPE 20L eau potable traitee, bouchon securite anti-effraction. Certifiee potable OMS.',
        (SELECT id FROM entrepots WHERE code = 'ENT-KHN-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-ANTIBIO-AMOX-500',
        'Antibiotiques Amoxicilline 500mg (boite 30 gelules)',
        'MEDICAMENT', 'Antibiotiques',
        'boite',
        'Amoxicilline trihydrate 500mg. Prescription medicale requise. Stockage < 25 degres C.',
        (SELECT id FROM entrepots WHERE code = 'ENT-KHN-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-GENSET-2KW',
        'Generatrice Portable 2kW + Jerricane 5L',
        'EQUIPEMENT', 'Production energie',
        'unite',
        'Groupe electrogene 2000W, monophase 220V, demarrage electrique, autonomie 8h/5L.',
        (SELECT id FROM entrepots WHERE code = 'ENT-KHN-01'),
        '00000000-0000-0000-0000-000000000001'
    );

-- Entrepot Provincial d'Azilal
INSERT INTO materiels
    (reference, nom, categorie, sous_categorie, unite, description, entrepot_id, created_by)
VALUES
    (
        'MAT-TENTE-AZL-2P',
        'Tente Legere 4 Saisons 2 Places',
        'TENTE', 'Abri individuel',
        'unite',
        'Tente igloo 2 places, double paroi, impermeabilite 4000mm. Poids 2,3 kg. Ideale terrain difficile.',
        (SELECT id FROM entrepots WHERE code = 'ENT-AZL-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-EAU-SIDI-ALI-1L',
        'Pack Eau Source Sidi Ali 1L (lot de 6 bouteilles)',
        'EAU', 'Eau de source',
        'lot',
        'Eau de source naturelle Sidi Ali, 6 bouteilles de 1L par lot. Pauvre en sodium.',
        (SELECT id FROM entrepots WHERE code = 'ENT-AZL-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-SERUM-PHYSIO-250',
        'Serum Physiologique 250ml NaCl 0,9% (boite 12 ampoules)',
        'MEDICAMENT', 'Soins infirmiers',
        'boite',
        'Solution NaCl 0,9% sterile. Usage soins plaies, rinçage yeux et nez.',
        (SELECT id FROM entrepots WHERE code = 'ENT-AZL-01'),
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        'MAT-RATION-COMP-3500',
        'Ration Alimentaire Compacte 3500kcal (24h)',
        'NOURRITURE', 'Ration de combat',
        'ration',
        'Ration journaliere compacte 3500kcal : biscuits energie, chocolat, the, sucre. DLC 5 ans.',
        (SELECT id FROM entrepots WHERE code = 'ENT-AZL-01'),
        '00000000-0000-0000-0000-000000000001'
    );


-- ============================================================
-- SEED : STOCKS
-- Quantites refletant l'etat APRES les missions ci-dessous.
-- ATTENTION : le stock Tentes Azilal (8 unites) est EN DESSOUS
-- du seuil d'alerte (15) → visible dans le dashboard Admin.
-- ============================================================
INSERT INTO stocks
    (entrepot_id, materiel_id, quantite, seuil_alerte, derniere_entree, updated_by)
VALUES
    -- Beni Mellal
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-BML-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-TENTE-BML-3P'),
        185, 20, NOW() - INTERVAL '15 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-BML-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-EAU-OULMES-15L'),
        470, 50, NOW() - INTERVAL '15 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-BML-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-KIT-MED-URG'),
        72, 10, NOW() - INTERVAL '15 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-BML-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-COLIS-SURV-7J'),
        280, 30, NOW() - INTERVAL '15 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-BML-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-COUV-LAINE-200'),
        400, 40, NOW() - INTERVAL '30 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    -- Khenifra
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-KHN-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-TENTE-KHN-6P'),
        70, 10, NOW() - INTERVAL '20 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-KHN-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-EAU-BIDON-20L'),
        195, 25, NOW() - INTERVAL '20 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-KHN-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-ANTIBIO-AMOX-500'),
        142, 20, NOW() - INTERVAL '20 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-KHN-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-GENSET-2KW'),
        11, 3, NOW() - INTERVAL '45 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    -- Azilal (tentes EN ALERTE : 8 < seuil 15)
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-AZL-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-TENTE-AZL-2P'),
        8, 15, NOW() - INTERVAL '5 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-AZL-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-EAU-SIDI-ALI-1L'),
        315, 40, NOW() - INTERVAL '5 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-AZL-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-SERUM-PHYSIO-250'),
        82, 12, NOW() - INTERVAL '5 days',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        (SELECT id FROM entrepots WHERE code      = 'ENT-AZL-01'),
        (SELECT id FROM materiels WHERE reference = 'MAT-RATION-COMP-3500'),
        165, 20, NOW() - INTERVAL '10 days',
        '00000000-0000-0000-0000-000000000001'
    );


-- ============================================================
-- SEED : MISSIONS DE LIVRAISON
-- Scenario demo jury :
--   MSN-2026-00001 → pending     (Youssef Amalou, Azilal)
--   MSN-2026-00002 → in_progress (Rachid Benali, Beni Mellal)
--   MSN-2026-00003 → completed   (Hassan Bourass — audit visible)
--   MSN-2026-00004 → draft       (Khenifra, sans distributeur)
-- ============================================================
INSERT INTO missions_livraison (
    numero_mission,  entrepot_source_id,  distributeur_id,
    destination_nom, destination_adresse, destination_lat, destination_lng,
    statut,          priorite,            date_echeance,
    notes,           created_by,          started_at,     completed_at,
    commentaire_terrain,                  livraison_lat,  livraison_lng
) VALUES
    (
        'MSN-2026-00001',
        (SELECT id FROM entrepots    WHERE code              = 'ENT-AZL-01'),
        (SELECT id FROM distributeurs WHERE keycloak_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
        'Douar Tizgui - Commune Tabant, Province d''Azilal',
        'Douar Tizgui, Tabant 22150',
        31.9892, -6.4235,
        'pending', 'high', NOW() + INTERVAL '2 days',
        'Piste non goudronnee apres Tabant. Contacter moqaddem Ssi Brahim au 0661-234-789 a l''arrivee.',
        '00000000-0000-0000-0000-000000000001',
        NULL, NULL, NULL, NULL, NULL
    ),
    (
        'MSN-2026-00002',
        (SELECT id FROM entrepots    WHERE code              = 'ENT-BML-01'),
        (SELECT id FROM distributeurs WHERE keycloak_user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
        'Douar Ait Bou Oulli - Vallee d''Ait Bou Guemez, Azilal',
        'Commune Ait Bou Guemez, piste RP1703',
        31.8752, -6.3198,
        'in_progress', 'critique', NOW() + INTERVAL '1 day',
        'Vallee enclavee apres les pluies. Village de 280 pers. sans acces routier depuis 48h. Priorite absolue.',
        '00000000-0000-0000-0000-000000000001',
        NOW() - INTERVAL '4 hours', NULL, NULL, NULL, NULL
    ),
    (
        'MSN-2026-00003',
        (SELECT id FROM entrepots    WHERE code              = 'ENT-AZL-01'),
        (SELECT id FROM distributeurs WHERE keycloak_user_id = 'd4e5f6a7-b8c9-0123-def0-234567890123'),
        'Douar Ifrane Antlas - Commune Talmest, Province d''Azilal',
        'Douar Ifrane Antlas, Talmest',
        32.0123, -6.5512,
        'completed', 'high', NOW() - INTERVAL '1 day',
        'Precedente tournee suite aux intemperies du 22 mars.',
        '00000000-0000-0000-0000-000000000001',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day',
        'Piste principale impraticable au km 8 suite aux glissements. Deviation par chemin de crete effectuee. Livraison complete aux 47 familles du douar. Accueil chaleureux du khalifa.',
        32.0098, -6.5489
    ),
    (
        'MSN-2026-00004',
        (SELECT id FROM entrepots    WHERE code              = 'ENT-KHN-01'),
        NULL,
        'Douar Imgoun - Commune Aghbala, Province de Beni Mellal',
        'Commune Aghbala, route N8 direction Midelt km 45',
        32.4801, -5.2145,
        'draft', 'medium', NOW() + INTERVAL '5 days',
        'Zone montagneuse a 1800m d''altitude. Prevoir vehicule 4x4. Evaluation des besoins en cours.',
        '00000000-0000-0000-0000-000000000001',
        NULL, NULL, NULL, NULL, NULL
    );


-- ============================================================
-- SEED : ITEMS DES MISSIONS
-- ============================================================

-- Items MSN-2026-00001 (pending — Tizgui/Azilal)
INSERT INTO mission_items (mission_id, materiel_id, quantite_prevue, quantite_livree)
VALUES
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00001'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-TENTE-AZL-2P'),
        10, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00001'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-EAU-SIDI-ALI-1L'),
        25, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00001'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-SERUM-PHYSIO-250'),
        5, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00001'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-RATION-COMP-3500'),
        15, NULL
    );

-- Items MSN-2026-00002 (in_progress — Ait Bou Guemez)
INSERT INTO mission_items (mission_id, materiel_id, quantite_prevue, quantite_livree)
VALUES
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00002'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-TENTE-BML-3P'),
        15, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00002'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-EAU-OULMES-15L'),
        30, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00002'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-KIT-MED-URG'),
        8, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00002'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-COLIS-SURV-7J'),
        20, NULL
    );

-- Items MSN-2026-00003 (completed — Ifrane Antlas)
-- quantite_livree = quantite_prevue : livraison totale confirmee
INSERT INTO mission_items (mission_id, materiel_id, quantite_prevue, quantite_livree)
VALUES
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00003'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-TENTE-AZL-2P'),
        8, 8
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00003'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-EAU-SIDI-ALI-1L'),
        20, 20
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00003'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-SERUM-PHYSIO-250'),
        3, 3
    );

-- Items MSN-2026-00004 (draft — Imgoun/Khenifra)
INSERT INTO mission_items (mission_id, materiel_id, quantite_prevue, quantite_livree)
VALUES
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00004'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-TENTE-KHN-6P'),
        5, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00004'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-EAU-BIDON-20L'),
        10, NULL
    ),
    (
        (SELECT id FROM missions_livraison WHERE numero_mission = 'MSN-2026-00004'),
        (SELECT id FROM materiels           WHERE reference     = 'MAT-ANTIBIO-AMOX-500'),
        8, NULL
    );
