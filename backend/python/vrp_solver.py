#!/usr/bin/env python3
"""
VRP Solver — Google OR-Tools (Python)
======================================
Résout un problème de tournées de véhicules (VRP) multi-dépôts.

Entrée  (stdin)  : JSON VrpInput
Sortie  (stdout) : JSON VrpTournee[]

Dépendances : ortools >= 9.x
  pip install ortools

Fonction objectif :
  Z = λ1 · DistanceTotale + λ2 · TempsTotalEstimé − λ3 · CouvertureTotale
"""

import sys
import json
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


# ── Constantes ────────────────────────────────────────────────────────────────
VITESSE_KMH   = 40          # vitesse moyenne en zone rurale sinistrée
SCALE_FACTOR  = 1000        # facteur pour passer des réels aux entiers OR-Tools
MAX_DISTANCE_M = 500_000    # rayon max d'une tournée (500 km)


# ── Utilitaires géographiques ─────────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance en km entre deux coordonnées GPS (formule de Haversine)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_distance_matrix(nodes: list[dict]) -> list[list[int]]:
    """
    Construit la matrice de distances entières (mètres × SCALE_FACTOR).
    Les nœuds sont : [dépôts (entrepôts), puis douars].
    """
    n = len(nodes)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist_km = haversine(
                    nodes[i]['latitude'], nodes[i]['longitude'],
                    nodes[j]['latitude'], nodes[j]['longitude'],
                )
                matrix[i][j] = int(dist_km * SCALE_FACTOR)
    return matrix


# ── Solveur principal ─────────────────────────────────────────────────────────

def solve(data: dict) -> list[dict]:
    entrepots   = data['entrepots']
    douars      = data['douars']
    lambdas     = data['lambdas']

    if not douars:
        return []

    # ── Construction des nœuds (dépôts d'abord, puis clients) ────────────────
    depot_count  = len(entrepots)
    nodes        = entrepots + douars          # liste unifiée
    node_count   = len(nodes)

    # ── Matrice de distances ──────────────────────────────────────────────────
    dist_matrix  = build_distance_matrix(nodes)

    # ── Nombre total de véhicules et mapping dépôt → [véhicule indices] ──────
    vehicle_depot_map = []   # vehicle_idx → depot_node_idx
    vehicle_capacity  = []

    for d_idx, ent in enumerate(entrepots):
        for _ in range(ent['nbVehicules']):
            vehicle_depot_map.append(d_idx)
            vehicle_capacity.append(ent['capacite'])

    num_vehicles = len(vehicle_depot_map)

    if num_vehicles == 0 or depot_count == 0:
        return []

    # ── Création du modèle OR-Tools ───────────────────────────────────────────
    manager = pywrapcp.RoutingIndexManager(
        node_count,
        num_vehicles,
        vehicle_depot_map,   # start nodes
        vehicle_depot_map,   # end nodes (retour au dépôt)
    )
    routing = pywrapcp.RoutingModel(manager)

    # ── Callback de distance ──────────────────────────────────────────────────
    def distance_callback(from_idx, to_idx):
        i = manager.IndexToNode(from_idx)
        j = manager.IndexToNode(to_idx)
        return dist_matrix[i][j]

    transit_cb_idx = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_idx)

    # ── Dimension Distance (contrainte de rayon max) ──────────────────────────
    routing.AddDimension(
        transit_cb_idx,
        0,                          # pas de slack
        int(MAX_DISTANCE_M * SCALE_FACTOR),
        True,                       # start cumul à 0
        'Distance',
    )

    # ── Paramètres de recherche ───────────────────────────────────────────────
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 30
    search_params.log_search = False

    # ── Résolution ────────────────────────────────────────────────────────────
    solution = routing.SolveWithParameters(search_params)

    if not solution:
        # Fallback : solution greedy sans optimisation
        search_params.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GREEDY_DESCENT
        )
        search_params.time_limit.seconds = 10
        solution = routing.SolveWithParameters(search_params)

    if not solution:
        return []

    # ── Extraction des tournées ────────────────────────────────────────────────
    tournees = []
    lam1 = lambdas.get('distance',   0.4)
    lam2 = lambdas.get('temps',      0.3)
    lam3 = lambdas.get('couverture', 0.3)

    for v_idx in range(num_vehicles):
        depot_node  = vehicle_depot_map[v_idx]
        entrepot    = entrepots[depot_node]

        index  = routing.Start(v_idx)
        etapes = []
        ordre  = 1
        dist_total_km = 0.0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            next_index = solution.Value(routing.NextVar(index))
            next_node  = manager.IndexToNode(next_index)

            # Calculer la distance de cet arc
            arc_km = dist_matrix[node][next_node] / SCALE_FACTOR

            if node >= depot_count:
                # C'est un douar client
                douar = nodes[node]
                etapes.append({
                    'douarId':    douar['id'],
                    'douarNom':   douar['nom'],
                    'ordre':      ordre,
                    'latitude':   douar['latitude'],
                    'longitude':  douar['longitude'],
                    'population': douar.get('population', 0),
                })
                ordre += 1

            dist_total_km += arc_km
            index = next_index

        # Ignorer les tournées vides (véhicule non utilisé)
        if not etapes:
            continue

        temps_min   = (dist_total_km / VITESSE_KMH) * 60
        couverture  = sum(e['population'] for e in etapes)
        score_z     = lam1 * dist_total_km + lam2 * temps_min - lam3 * couverture

        tournees.append({
            'entrepotId':       entrepot['id'],
            'entrepotNom':      entrepot['nom'],
            'vehiculeCapacite': vehicle_capacity[v_idx],
            'etapes':           etapes,
            'distanceTotale':   round(dist_total_km, 3),
            'tempsEstime':      round(temps_min),
            'scoreZ':           round(score_z, 4),
        })

    return tournees


# ── Point d'entrée ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        result = solve(data)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
