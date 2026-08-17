import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import UIKitProvider from "./css/UIKitProvider";
import { MvpProvider, useMvpMode } from "./contexts/MvpContext";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import AppLayout from "./components/AppLayout";
import ExtensionsOverview from "./pages/ExtensionsOverview";
import ModuleList from "./pages/ModuleList";
import ModuleEditor from "./pages/ModuleEditor";
import ModuleInstances from "./pages/ModuleInstances";
import Attributes from "./pages/Attributes";
import InstanceOverview from "./pages/InstanceOverview";
import Marketplace from "./pages/Marketplace";

function IndexRoute() {
  const { isMvp } = useMvpMode();
  return isMvp ? <Navigate to="/extensions" replace /> : <ExtensionsOverview />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <IndexRoute />,
      },
      {
        path: "extensions",
        element: <ModuleList />,
      },
      {
        path: "attributes",
        element: <Attributes />,
      },
      {
        path: "modules/:id",
        element: <ModuleEditor />,
      },
      {
        path: "modules/:id/instances",
        element: <ModuleInstances />,
      },
      {
        path: "instances",
        element: <InstanceOverview />,
      },
      {
        path: "marketplace",
        element: <Marketplace />,
      },
    ],
  },
]);

function App() {
  return (
    <UIKitProvider>
      <MvpProvider>
        <MarketplaceProvider>
          <RouterProvider router={router} />
        </MarketplaceProvider>
      </MvpProvider>
    </UIKitProvider>
  );
}

export default App;
