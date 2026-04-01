import { SidebarProvider, useSidebar } from './SidebarContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

// Backdrop mobile
const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      onClick={toggleMobileSidebar}
    />
  );
};

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-950">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <AppHeader />
        <main className="p-4 mx-auto max-w-screen-2xl md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarProvider>
    <LayoutContent>{children}</LayoutContent>
  </SidebarProvider>
);

export default AppLayout;
