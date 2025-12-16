import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface ExtractProcessorProps {
  onExtractSaved?: () => void;
}

export const ExtractProcessor = ({ onExtractSaved }: ExtractProcessorProps) => {
  const [extractText, setExtractText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedFileName, setSavedFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseExtractDate = (text: string): string | null => {
    const lines = text.split('\n');

    // Find the header line
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Dt. movimento') && line.includes('Dt. balancete')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) return null;

    // Get the first data line after header
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Extract first date in DD/MM/YYYY format
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);

      if (dateMatch) {
        const date = dateMatch[1];
        const [day, month, year] = date.split('/');
        return `${day}_${month}_${year}`;
      }
    }

    return null;
  };

  const handleFileRead = async (file: File) => {
    const text = await file.text();
    setExtractText(text);
    setSelectedFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileRead(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileRead(file);
    }
  };

  const saveExtract = async () => {
    if (!extractText.trim()) {
      toast.error("Por favor, selecione um arquivo de extrato");
      return;
    }

    setIsProcessing(true);

    try {
      // Filter out lines containing prohibited terms
      const prohibitedTerms = ["Rende Facil", "Rende Fácil", "BB Rende", "BB Rende Fácil"];
      const filteredText = extractText
        .split('\n')
        .filter(line => !prohibitedTerms.some(term => line.includes(term)))
        .join('\n');

      // Parse date from extract
      const fileName = parseExtractDate(filteredText);
      if (!fileName) {
        toast.error("Não foi possível extrair data/hora do extrato");
        setIsProcessing(false);
        return;
      }

      // Save extract file to storage (upsert to allow overwrite)
      const blob = new Blob([filteredText], { type: 'text/plain' });
      const { error: uploadError } = await supabase.storage
        .from('extratos')
        .upload(`${fileName}.txt`, blob, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      setSavedFileName(fileName);
      toast.success(`Extrato salvo com sucesso: ${fileName}.txt`);
      setExtractText("");
      setSelectedFile(null);

      if (onExtractSaved) {
        onExtractSaved();
      }

    } catch (error: any) {
      console.error('Error saving extract:', error);
      toast.error(`Erro ao salvar extrato: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Salvar Extrato
          </CardTitle>
          <CardDescription>
            Cole o texto completo do extrato bancário abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
              }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Arraste o arquivo do extrato aqui
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou
            </p>
            <Input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileSelect}
              className="max-w-xs mx-auto cursor-pointer"
            />
          </div>

          {selectedFile && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Arquivo selecionado:</p>
              <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            </div>
          )}

          <Button
            onClick={saveExtract}
            disabled={isProcessing || !extractText}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              "Salvando..."
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Salvar Extrato
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {savedFileName && (
        <Card className="border-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              Extrato Salvo
            </CardTitle>
            <CardDescription>
              Arquivo: {savedFileName}.txt
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
