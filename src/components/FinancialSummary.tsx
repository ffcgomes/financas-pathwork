import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExtractRecord, parseExtractRecords, parseBrValue, ExtractMetadata } from "@/utils/extractUtils";

interface CategorySummary {
    category: string;
    totalEntradas: number;
    totalSaidas: number;
    saldo: number;
}

interface FinancialSummaryProps {
    refreshTrigger?: number;
}

export const FinancialSummary = ({ refreshTrigger = 0 }: FinancialSummaryProps) => {
    const [summaryData, setSummaryData] = useState<CategorySummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalEntradasGeral, setTotalEntradasGeral] = useState(0);
    const [totalSaidasGeral, setTotalSaidasGeral] = useState(0);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 1. Load Metadata (Mappings)
            const { data: metadataData, error: metadataError } = await supabase.storage
                .from('extratos')
                .download('metadata.json');

            let mappings: { [key: string]: string } = {};
            if (!metadataError && metadataData) {
                const text = await metadataData.text();
                const json = JSON.parse(text);
                if (json && typeof json.mappings === 'object') {
                    mappings = json.mappings;
                }
            }

            // 2. Load "Extratos.txt"
            const { data: extractData, error: extractError } = await supabase.storage
                .from('extratos')
                .download('Extratos.txt');

            if (extractError) {
                throw new Error('Arquivo Extratos.txt não encontrado. Por favor, mescle extratos primeiro.');
            }

            const extractText = await extractData.text();
            const records = parseExtractRecords(extractText);

            // 3. Process Data
            const categoryMap = new Map<string, CategorySummary>();
            let tEntradas = 0;
            let tSaidas = 0;

            records.forEach(record => {
                const descriptionKey = record.historico.trim();
                const category = mappings[descriptionKey] || 'Sem Categoria';

                if (!categoryMap.has(category)) {
                    categoryMap.set(category, {
                        category,
                        totalEntradas: 0,
                        totalSaidas: 0,
                        saldo: 0
                    });
                }

                const summary = categoryMap.get(category)!;
                const val = parseBrValue(record.valor);

                if (record.type === 'C') {
                    summary.totalEntradas += val;
                    tEntradas += val;
                } else {
                    summary.totalSaidas += val;
                    tSaidas += val;
                }
                summary.saldo = summary.totalEntradas - summary.totalSaidas;
            });

            // Convert map to array and sort
            const summaryArray = Array.from(categoryMap.values()).sort((a, b) => {
                // Sort by name or magnitude? Let's sort alphabetically for now, or maybe by largest movement?
                // User asked for "subtotals", usually alphabetical or grouped makes sense.
                // Let's go with Alphabetical for now to keep it organized.
                return a.category.localeCompare(b.category);
            });

            setSummaryData(summaryArray);
            setTotalEntradasGeral(tEntradas);
            setTotalSaidasGeral(tSaidas);

        } catch (error: any) {
            console.error('Error loading summary data:', error);
            // toast.error(`Erro ao carregar resumo: ${error.message}`); 
            // Suppress annoying toasts on initial load if files missing
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Resumo Financeiro por Origem/Destino
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <CardDescription>
                    Baseado em Extratos.txt
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando dados...</div>
                ) : summaryData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado ou arquivo não existe.</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Entradas</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">R$ {formatCurrency(totalEntradasGeral)}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900">
                                <p className="text-sm font-medium text-red-800 dark:text-red-300">Total Saídas</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {formatCurrency(totalSaidasGeral)}</p>
                            </div>
                            <div className={`p-4 rounded-lg border ${totalEntradasGeral - totalSaidasGeral >= 0 ? 'bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900' : 'bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900'}`}>
                                <p className={`text-sm font-medium ${totalEntradasGeral - totalSaidasGeral >= 0 ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>Saldo Líquido</p>
                                <p className={`text-2xl font-bold ${totalEntradasGeral - totalSaidasGeral >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>R$ {formatCurrency(totalEntradasGeral - totalSaidasGeral)}</p>
                            </div>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Origem/Destino (Categoria)</TableHead>
                                        <TableHead className="text-right text-blue-600">Entradas</TableHead>
                                        <TableHead className="text-right text-red-600">Saídas</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryData.map((item) => (
                                        <TableRow key={item.category}>
                                            <TableCell className="font-medium">
                                                {item.category === 'Sem Categoria' ? <span className="text-muted-foreground italic">{item.category}</span> : item.category}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-blue-600">
                                                {item.totalEntradas > 0 ? formatCurrency(item.totalEntradas) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-600">
                                                {item.totalSaidas > 0 ? formatCurrency(item.totalSaidas) : '-'}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono font-medium ${item.saldo >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                {formatCurrency(item.saldo)} {item.saldo >= 0 ? 'C' : 'D'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
