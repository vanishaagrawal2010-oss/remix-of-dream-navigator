import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/Loader";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullscreen size="lg" label="Opening Maison" />;
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
};

export default Index;
