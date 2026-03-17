import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const SetupPlatformAdmin = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "created" | "exists" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("setup-platform-admin", {
          method: "POST",
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message || "Unknown error");
          return;
        }

        if (data?.already_exists) {
          setStatus("exists");
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
        } else if (data?.created) {
          setStatus("created");
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
        } else if (data?.error) {
          setStatus("error");
          setErrorMsg(data.error);
        }
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Platform Admin Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Setting up platform admin account…</p>
            </div>
          )}

          {status === "created" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="text-foreground font-medium">Account created successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to login…</p>
            </div>
          )}

          {status === "exists" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-foreground">Account already exists.</p>
              <p className="text-sm text-muted-foreground">Redirecting to login…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-destructive font-medium">Setup failed</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPlatformAdmin;
