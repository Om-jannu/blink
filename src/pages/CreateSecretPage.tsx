import { CreateSecret } from '@/components/CreateSecret';

export function CreateSecretPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Secret</h1>
        <p className="text-muted-foreground">
          Share a secure message or file that will self-destruct after viewing
        </p>
      </div>

      {/* Create Secret Component */}
      <CreateSecret />
    </div>
  );
}
