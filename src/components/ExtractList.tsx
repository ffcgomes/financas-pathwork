import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Trash2, RefreshCw, Eye, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtractFile {
  name: string;
  created_at: string;
}

interface ExtractRecord {
  dt_movimento: string;
  ag_origem: string;
  lote: string;
  historico: string;
  documento: string;
  valor: string;
  cpf?: string;
  cnpj?: string;
  nome?: string;
}

interface ExtractListProps {
  refreshTrigger?: number;
}

export const ExtractList = ({ refreshTrigger = 0 }: ExtractListProps) => {
  const [extracts, setExtracts] = useState<ExtractFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [viewingExtract, setViewingExtract] = useState<{ name: string; records: ExtractRecord[] } | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const loadExtracts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('extratos')
        .list();

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        const parseFileName = (name: string) => {
          const match = name.match(/(\d{2})_(\d{2})_(\d{4})/);
          if (!match) return new Date(0);
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };

        const dateA = parseFileName(a.name);
        const dateB = parseFileName(b.name);
        return dateA.getTime() - dateB.getTime();
      });

      setExtracts(sortedData);
    } catch (error: any) {
      console.error('Error loading extracts:', error);
      toast.error(`Erro ao carregar extratos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseExtractRecords = (text: string): ExtractRecord[] => {
    const lines = text.split('\n');
    const records: ExtractRecord[] = [];

    // Helper function to extract CPF/CNPJ and Nome from historico
    const extractCpfCnpjNome = (historico: string): { cpf?: string; cnpj?: string; nome?: string } => {
      // Remove date/time prefix if present (DD/MM HH:MM or DD/MM/YYYY HH:MM:SS)
      const withoutDateTime = historico
        .replace(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?\s+/, '')
        .replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, '');

      // Check if it starts with a sequence of 11 or 14 digits (CPF or CNPJ) without formatting
      const cpfCnpjMatch = withoutDateTime.match(/^(\d{11,14})\s+(.+)$/);

      if (cpfCnpjMatch) {
        const digits = cpfCnpjMatch[1];
        let cpf = '', cnpj = '';

        // Logic: CNPJ if 14 digits and digits at index 8,9,10 are '000'
        // Index is 0-based, so 8,9,10 are the 9th, 10th, 11th digits.
        // String substring(8, 11) gets characters at 8, 9, 10.
        if (digits.length === 14 && digits.substring(8, 11) === '000') {
          cnpj = digits;
        } else {
          // Keep only the last 11 digits for CPF
          cpf = digits.length > 11 ? digits.substring(digits.length - 11) : digits;
        }

        return {
          cpf,
          cnpj,
          nome: cpfCnpjMatch[2].trim()
        };
      }

      // Check if it starts with formatted number (with dots/dashes) followed by a name
      // This is a bit looser, could be CPF or CNPJ formatted.
      // Let's assume formatted ones: if ends in /0001-XX or similar, it's CNPJ.
      // But typically statements have raw numbers. Let's keep existing simple check for formatted 
      // but maybe try to distinguish? The prompt was specific about the 14 digits and 000 logic.
      // For formatted, let's strip non-digits and apply the same logic?
      const formattedNumberMatch = withoutDateTime.match(/^([\d.\/\-]+)\s+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ].+)$/);

      if (formattedNumberMatch) {
        const rawDigits = formattedNumberMatch[1].replace(/\D/g, '');
        let cpf = '', cnpj = '';

        if (rawDigits.length === 14 && rawDigits.substring(8, 11) === '000') {
          cnpj = formattedNumberMatch[1];
        } else {
          // If it looks like a formatted CPF (11 digits), put in CPF column
          if (rawDigits.length === 11 || (rawDigits.length === 14 && rawDigits.substring(8, 11) !== '000')) {
            // For formatted matching, if we need to truncate, we better use the raw digits to avoid broken formatting
            if (rawDigits.length > 11) {
              cpf = rawDigits.substring(rawDigits.length - 11);
            } else {
              cpf = formattedNumberMatch[1];
            }
          }
        }

        if (cpf || cnpj) {
          return {
            cpf,
            cnpj,
            nome: formattedNumberMatch[2].trim()
          }
        }

        return {
          nome: formattedNumberMatch[2].trim()
        };
      }

      // Check if the text looks like a person's name
      // Accept names in uppercase, mixed case, or proper case
      const trimmedText = withoutDateTime.trim();

      // Pattern matches names that:
      // - Start with a letter (upper or lower)
      // - Contain at least one space and another word
      // - Don't start with common descriptive terms
      const looksLikeName = /^[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý]+(\s+[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý.]*)+$/.test(trimmedText);

      // Exclude common descriptive terms
      const isDescriptive = /^(tar\.|rende|tarifa|pagamento|transferencia|saldo|lancamento)/i.test(trimmedText);

      if (looksLikeName && !isDescriptive) {
        return {
          nome: trimmedText
        };
      }

      // If it's descriptive text or doesn't look like a name, return empty
      return {};
    };

    // Find the header line - check for both formats (original and merged)
    let headerIndex = -1;
    let isMergedFormat = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Dt. movimento')) {
        headerIndex = i;
        // Check if it's the merged format (without "Dt. balancete")
        isMergedFormat = !line.includes('Dt. balancete');
        break;
      }
    }

    if (headerIndex === -1) return records;

    // Parse records after header until "Lançamentos futuros"
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Stop processing when reaching "Lançamentos futuros"
      if (lineLower.includes('lançamentos futuros') ||
        lineLower.includes('lancamentos futuros')) {
        break;
      }

      // Skip "Saldo Anterior" and "S A L D O" lines
      if (lineLower.includes('saldo anterior') ||
        lineLower.replace(/\s/g, '').includes('saldo')) {
        continue;
      }

      if (!line) continue;
      if (line.includes('===') || line.includes('---') || lineLower.includes('total')) {
        continue;
      }

      const parts = line.split(/\s{2,}/);

      // Check if this line starts with a date
      if (parts.length >= 4 && parts[0].match(/\d{2}\/\d{2}\/\d{4}/)) {
        if (isMergedFormat) {
          // Merged format: all data in one line
          // Format: dt_movimento  ag_origem  lote  historico  documento  valor
          const rawHistorico = parts[3]?.trim() || '';
          const { cpf, cnpj, nome } = extractCpfCnpjNome(rawHistorico);

          records.push({
            dt_movimento: parts[0]?.trim() || '',
            ag_origem: parts[1]?.trim() || '',
            lote: parts[2]?.trim() || '',
            historico: rawHistorico,
            documento: parts[4]?.trim() || '',
            valor: parts[5]?.trim() || '',
            cpf,
            cnpj,
            nome,
          });
        } else {
          // Original format: data in first line, historico in second line
          // Format: dt_movimento  dt_balancete  ag_origem  lote  documento  valor  saldo
          // Get historico from next line (skip empty lines)
          let historico = '';
          let nextLineIndex = i + 1;
          while (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            if (nextLine && !nextLine.includes('===') && !nextLine.includes('---')) {
              historico = nextLine;
              break;
            }
            nextLineIndex++;
          }

          // Extract valor (Valor R$) from the line using Brazilian currency pattern
          // This avoids mixing it up with the Documento column
          let valor = '';
          const moneyMatches = line.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g);
          if (moneyMatches && moneyMatches.length > 0) {
            if (moneyMatches.length >= 2) {
              // When there are two monetary values, the penultimate is usually Valor R$ and the last is Saldo
              valor = moneyMatches[moneyMatches.length - 2];
            } else {
              valor = moneyMatches[0];
            }
          } else {
            // Fallback to positional parsing if pattern is not found
            valor = parts[5]?.trim() || '';
          }

          const { cpf, cnpj, nome } = extractCpfCnpjNome(historico);

          records.push({
            dt_movimento: parts[0]?.trim() || '',
            ag_origem: parts[2]?.trim() || '',
            lote: parts[3]?.trim() || '',
            documento: parts[4]?.trim() || '',
            valor,
            historico: historico,
            cpf,
            cnpj,
            nome,
          });

          // Skip the historico line we just processed
          i = nextLineIndex;
        }
      }
    }

    return records;
  };

  const mergeExtracts = async () => {
    if (extracts.length === 0) {
      toast.error("Nenhum extrato para mesclar");
      return;
    }

    setIsMerging(true);

    try {
      const allRecords: ExtractRecord[] = [];
      const recordKeys = new Set<string>();

      const normalizeField = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      // Filter out the merged file itself to avoid duplication
      const extractsToMerge = extracts.filter(e => e.name !== 'Extratos.txt');

      // Sort extracts by date (from filename in format dd_mm_yyyy.txt)
      const sortedExtracts = extractsToMerge.sort((a, b) => {
        const parseFileName = (name: string) => {
          const match = name.match(/(\d{2})_(\d{2})_(\d{4})/);
          if (!match) return new Date(0);
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };

        const dateA = parseFileName(a.name);
        const dateB = parseFileName(b.name);
        return dateA.getTime() - dateB.getTime();
      });

      // Load and parse all extracts
      for (let index = 0; index < sortedExtracts.length; index++) {
        const extract = sortedExtracts[index];
        const { data, error } = await supabase.storage
          .from('extratos')
          .download(extract.name);

        if (error) throw error;

        const text = await data.text();
        const records = parseExtractRecords(text);

        // Add only unique records (ignorando diferenças de agência/lote e pequenas variações de formatação)
        for (const record of records) {
          const key = [
            record.dt_movimento,
            record.historico,
            record.documento,
            record.valor,
          ]
            .map((field) => normalizeField(field || ""))
            .join("|");

          if (!recordKeys.has(key)) {
            recordKeys.add(key);
            allRecords.push(record);
          }
        }
      }

      if (allRecords.length === 0) {
        toast.error("Nenhum registro encontrado nos extratos");
        setIsMerging(false);
        return;
      }

      // Create merged extract content
      const header = `Extrato Consolidado
Gerado em: ${new Date().toLocaleString('pt-BR')}

Dt. movimento    Ag. origem        Lote     Histórico                                    Documento         Valor R$

`;

      const recordLines = allRecords.map(record => {
        const parts = [
          record.dt_movimento,
          record.ag_origem,
          record.lote,
          record.historico,
          record.documento,
          record.valor
        ];
        return parts.join('  ');
      });

      const mergedContent = header + recordLines.join('\n');

      // Save merged extract
      const blob = new Blob([mergedContent], { type: 'text/plain' });
      const fileName = 'Extratos.txt';

      const { error: uploadError } = await supabase.storage
        .from('extratos')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      toast.success(`Extratos mesclados com sucesso! ${allRecords.length} registros únicos salvos em ${fileName}`);
      await loadExtracts();

    } catch (error: any) {
      console.error('Error merging extracts:', error);
      toast.error(`Erro ao mesclar extratos: ${error.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const viewExtract = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('extratos')
        .download(fileName);

      if (error) throw error;

      const text = await data.text();
      const records = parseExtractRecords(text);
      setViewingExtract({ name: fileName, records });
    } catch (error: any) {
      console.error('Error viewing extract:', error);
      toast.error(`Erro ao visualizar extrato: ${error.message}`);
    }
  };

  const deleteExtract = async (fileName: string) => {
    setDeletingFile(fileName);
    try {
      const { error } = await supabase.storage
        .from('extratos')
        .remove([fileName]);

      if (error) throw error;

      toast.success(`Extrato ${fileName} deletado com sucesso`);
      await loadExtracts();
    } catch (error: any) {
      console.error('Error deleting extract:', error);
      toast.error(`Erro ao deletar extrato: ${error.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  useEffect(() => {
    loadExtracts();
  }, [refreshTrigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Extratos Salvos
            </CardTitle>
            <CardDescription>
              {extracts.length} extrato(s) no sistema
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={mergeExtracts}
              disabled={isMerging || extracts.length === 0}
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {isMerging ? "Mesclando..." : "Mesclar Extratos"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadExtracts}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando extratos...
          </div>
        ) : extracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum extrato salvo ainda
          </div>
        ) : (
          <div className="space-y-2">
            {extracts.map((extract) => (
              <div
                key={extract.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => viewExtract(extract.name)}
                >
                  <p className="font-mono text-sm font-medium flex items-center gap-2 hover:text-primary">
                    <Eye className="w-4 h-4" />
                    {extract.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Salvo em: {formatDate(extract.created_at)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteExtract(extract.name)}
                  disabled={deletingFile === extract.name}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!viewingExtract} onOpenChange={() => setViewingExtract(null)}>
        <DialogContent className="max-w-7xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-mono">{viewingExtract?.name}</DialogTitle>
            <DialogDescription>
              {viewingExtract?.records.length} registro(s) encontrado(s)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dt. Movimento</TableHead>
                  <TableHead>Ag. Origem</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingExtract?.records.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{record.dt_movimento}</TableCell>
                    <TableCell className="font-mono text-xs">{record.ag_origem}</TableCell>
                    <TableCell className="font-mono text-xs">{record.lote}</TableCell>
                    <TableCell className="text-xs">{record.historico}</TableCell>
                    <TableCell className="font-mono text-xs">{record.cpf || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{record.cnpj || '-'}</TableCell>
                    <TableCell className="text-xs">{record.nome || '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-right">{record.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
