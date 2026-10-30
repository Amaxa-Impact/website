"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { CheckCircle, XCircle } from "lucide-react";

import { api } from "@amaxa/backend/_generated/api";
import { cn } from "@amaxa/ui";
import { Badge } from "@amaxa/ui/badge";
import { Button } from "@amaxa/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@amaxa/ui/card";

type InvitationRole = "admin" | "member";

const roleBadgeStyles: Record<InvitationRole, string> = {
  admin: "bg-info-soft text-info",
  member: "bg-neutral-soft text-neutral",
};

interface InviteAcceptClientProps {
  token: string;
  invitation: {
    email: string;
    role: InvitationRole;
    workspaceName: string;
    workspaceSlug: string;
  };
  userEmail: string;
}

export function InviteAcceptClient({
  token,
  invitation,
  userEmail,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const acceptByToken = useMutation(api.workspaceInvitations.acceptByToken);

  const emailMismatch =
    userEmail.toLowerCase() !== invitation.email.toLowerCase();

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptByToken({ token });

      if (result.success && result.workspaceSlug) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${result.workspaceSlug}`);
        }, 1500);
      } else {
        setError(result.error ?? "Failed to accept invitation");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (success) {
    return (
      <div className="from-success-soft to-background flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="text-success mb-4 h-16 w-16" />
            <h1 className="mb-2 text-2xl font-bold">Welcome!</h1>
            <p className="text-muted-foreground">
              You've joined <strong>{invitation.workspaceName}</strong>.
              <br />
              Redirecting you now...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Workspace Invitation</h1>
          <p className="text-muted-foreground">
            You've been invited to join a workspace
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold">
                {invitation.workspaceName}
              </h2>
              <p className="text-muted-foreground text-sm">
                {invitation.workspaceSlug}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground text-sm">Role:</span>
              <Badge
                variant="secondary"
                className={cn(roleBadgeStyles[invitation.role])}
              >
                {invitation.role}
              </Badge>
            </div>
          </div>

          {emailMismatch && (
            <div className="border-warning-border bg-warning-soft flex items-start gap-3 rounded-lg border p-4">
              <XCircle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-warning font-medium">Email Mismatch</p>
                <p className="text-warning text-sm">
                  This invitation was sent to{" "}
                  <strong>{invitation.email}</strong>, but you're signed in as{" "}
                  <strong>{userEmail}</strong>.
                </p>
                <p className="text-warning mt-2 text-sm">
                  Please sign in with the correct email address to accept this
                  invitation.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="border-danger-border bg-danger-soft flex items-start gap-3 rounded-lg border p-4">
              <XCircle className="text-danger mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-danger font-medium">Error</p>
                <p className="text-danger text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="text-muted-foreground text-center text-sm">
            <p>
              Signed in as <strong>{userEmail}</strong>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || emailMismatch}
            className="w-full"
          >
            {isAccepting ? "Accepting..." : "Accept Invitation"}
          </Button>

          {emailMismatch && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/sign-out?redirect=/invite/" + token;
              }}
            >
              Sign in with different account
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
