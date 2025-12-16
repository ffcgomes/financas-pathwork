import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogRecord {
  id: string;
  dt_movimento: string;
  dt_balancete: string;
  ag_origem: string;
  lote: string;
  historico: string;
  documento: string;
  valor: string;
  saldo: string;
  extrato_origem: string;
  created_at: string;
}

export const LogViewer = () => {
  const [records, setRecords] = useState<LogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
    
    // Subscribe to changes
    const channel = supabase
      .channel('log_extratos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'log_extratos'
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('log_extratos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching records:', error);
      toast.error('Erro ao carregar registros');
    } finally {
      setIsLoading(false);
    }
  };

  const parseValue = (valor: string): number => {
    // Remove currency symbols and parse
    const cleaned = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const totalEntries = records.filter(r => parseValue(r.valor) > 0).length;
  const totalExits = records.filter(r => parseValue(r.valor) < 0).length;

  return (
    <Card className="border-2 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Log de Extratos
        </CardTitle>
        <CardDescription>
          Histórico consolidado de todos os registros únicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{records.length}</div>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </CardContent>
          </Card>
          <Card className="border-success">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <div className="text-2xl font-bold text-success">{totalEntries}</div>
              </div>
              <p className="text-sm text-muted-foreground">Entradas</p>
            </CardContent>
          </Card>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <div className="text-2xl font-bold text-destructive">{totalExits}</div>
              </div>
              <p className="text-sm text-muted-foreground">Saídas</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando registros...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro encontrado. Processe seu primeiro extrato acima.
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left p-2 font-semibold">Dt. Movimento</th>
                    <th className="text-left p-2 font-semibold">Dt. Balancete</th>
                    <th className="text-left p-2 font-semibold">Histórico</th>
                    <th className="text-left p-2 font-semibold">Documento</th>
                    <th className="text-right p-2 font-semibold">Valor R$</th>
                    <th className="text-right p-2 font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const value = parseValue(record.valor);
                    const isPositive = value > 0;
                    return (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{record.dt_movimento}</td>
                        <td className="p-2">{record.dt_balancete}</td>
                        <td className="p-2 max-w-[200px] truncate">{record.historico}</td>
                        <td className="p-2">{record.documento}</td>
                        <td className={`p-2 text-right font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {record.valor}
                        </td>
                        <td className="p-2 text-right font-mono">{record.saldo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
