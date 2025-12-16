import { useState } from "react";
import { ExtractProcessor } from "@/components/ExtractProcessor";
import { ExtractList } from "@/components/ExtractList";
import { CadastroManager } from "@/components/CadastroManager";
import { ExtractIdentifier } from "@/components/ExtractIdentifier";
import pathworkLogo from "@/assets/pathwork-logo.png";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExtractSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={pathworkLogo} alt="Pathwork Ceará" className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Pathwork Ceará</h1>
              <p className="text-sm text-muted-foreground">Gestão Financeira</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Sistema de Contas a Pagar e Receber</h2>
            <p className="text-muted-foreground text-lg">
              Cole e salve seus extratos bancários
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ExtractProcessor onExtractSaved={handleExtractSaved} />
            <ExtractList refreshTrigger={refreshTrigger} />
          </div>

          <div className="mt-8">
            <CadastroManager />
          </div>

          <div className="mt-8">
            <ExtractIdentifier />
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Associação Pathwork Ceará - Sistema de Gestão Financeira</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
