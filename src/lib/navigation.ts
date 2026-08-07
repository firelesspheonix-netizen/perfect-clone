import { useNavigate as useRouterNavigate } from "@tanstack/react-router";

/**
 * Small compatibility wrapper so components can call `navigate('/path')`
 * with a plain string, like in the original project.
 */
export function useNavigate() {
  const navigate = useRouterNavigate();
  return (to: string) => {
    void navigate({ to });
  };
}
