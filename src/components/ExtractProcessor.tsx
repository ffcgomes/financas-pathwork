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
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedFileNames, setSavedFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setSavedFileNames([]);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setSavedFileNames([]);
    }
  };

  const saveExtract = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Por favor, selecione pelo menos um arquivo de extrato");
      return;
    }

    setIsProcessing(true);
    const successfullySaved: string[] = [];
    const errors: string[] = [];

    try {
      for (const file of selectedFiles) {
        try {
          const text = await file.text();

          // Filter out lines containing prohibited terms
          const prohibitedTerms = ["Rende Facil", "Rende Fácil", "BB Rende", "BB Rende Fácil"];
          const filteredText = text
            .split('\n')
            .filter(line => !prohibitedTerms.some(term => line.includes(term)))
            .join('\n');

          // Parse date from extract
          const fileName = parseExtractDate(filteredText);
          if (!fileName) {
            errors.push(`${file.name}: Não foi possível extrair data/hora`);
            continue;
          }

          // Save extract file to storage (upsert to allow overwrite)
          const blob = new Blob([filteredText], { type: 'text/plain' });
          const { error: uploadError } = await supabase.storage
            .from('extratos')
            .upload(`${fileName}.txt`, blob, {
              upsert: true
            });

          if (uploadError) throw uploadError;
          successfullySaved.push(fileName);

        } catch (error: any) {
          console.error(`Error saving file ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      setSavedFileNames(successfullySaved);

      if (successfullySaved.length > 0) {
        toast.success(`${successfullySaved.length} extrato(s) salvo(s) com sucesso`);
        setSelectedFiles([]);
        if (onExtractSaved) {
          onExtractSaved();
        }
      }

      if (errors.length > 0) {
        errors.forEach(err => toast.error(err));
      }

    } catch (error: any) {
      console.error('Critical error saving extracts:', error);
      toast.error(`Erro crítico: ${error.message}`);
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
            Salvar Extrato(s)
          </CardTitle>
          <CardDescription>
            Arraste ou selecione um ou mais arquivos de extrato
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
              Arraste seus arquivos aqui
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou
            </p>
            <Input
              type="file"
              multiple
              accept=".txt,.csv"
              onChange={handleFileSelect}
              className="max-w-xs mx-auto cursor-pointer"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Arquivo(s) selecionado(s):</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={saveExtract}
            disabled={isProcessing || selectedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              "Salvando..."
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Salvar {selectedFiles.length > 1 ? "Extratos" : "Extrato"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {savedFileNames.length > 0 && (
        <Card className="border-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              Extratos Salvos
            </CardTitle>
            <CardDescription>
              Arquivos salvos:
              <ul className="list-disc list-inside mt-2">
                {savedFileNames.map((name, i) => (
                  <li key={i}>{name}.txt</li>
                ))}
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
