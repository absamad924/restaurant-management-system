import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('MANAGER' | 'CASHIER')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    // Decode the JWT payload (middle section of the token)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return <Navigate to="/login" replace />;
    }

    // Check if user's role is allowed on this route
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return <Navigate to={payload.role === 'MANAGER' ? '/admin' : '/pos'} replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }
}