import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, RefreshCw } from "lucide-react";

interface ExtractRecord {
  id: string;
  dt_movimento: string;
  historico: string;
  documento: string;
  valor: string;
  identificado_tipo?: string;
  identificado_id?: string;
  identificado_nome?: string;
}

interface Suggestion {
  tipo: string;
  id: string;
  nome: string;
  confianca: 'alta' | 'media' | 'baixa';
}

export const ExtractIdentifier = () => {
  const [records, setRecords] = useState<ExtractRecord[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [associados, setAssociados] = useState<any[]>([]);
  const [outros, setOutros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [recordsRes, alunosRes, associadosRes, outrosRes] = await Promise.all([
      supabase.from('log_extratos').select('*').eq('extrato_origem', 'Extratos.txt').order('dt_movimento'),
      supabase.from('cadastro_alunos').select('*'),
      supabase.from('cadastro_associados').select('*'),
      supabase.from('cadastro_outros').select('*')
    ]);

    if (recordsRes.data) setRecords(recordsRes.data);
    if (alunosRes.data) setAlunos(alunosRes.data);
    if (associadosRes.data) setAssociados(associadosRes.data);
    if (outrosRes.data) setOutros(outrosRes.data);
    setLoading(false);
  };

  const getSuggestion = async (record: ExtractRecord): Promise<Suggestion | null> => {
    // Tentar matching por CPF/CNPJ no documento
    const docClean = record.documento?.replace(/\D/g, '');
    
    if (docClean) {
      // Buscar no histórico primeiro
      const { data: historico } = await supabase
        .from('historico_identificacao')
        .select('*')
        .eq('documento', docClean)
        .limit(1);

      if (historico && historico.length > 0) {
        return {
          tipo: historico[0].tipo_cadastro,
          id: historico[0].cadastro_id,
          nome: historico[0].cadastro_nome,
          confianca: 'alta'
        };
      }

      // Buscar em alunos
      const aluno = alunos.find(a => a.cpf?.replace(/\D/g, '') === docClean);
      if (aluno) {
        return { tipo: 'aluno', id: aluno.id, nome: aluno.nome, confianca: 'alta' };
      }

      // Buscar em outros
      const outro = outros.find(o => o.cpf_cnpj?.replace(/\D/g, '') === docClean);
      if (outro) {
        return { tipo: 'outro', id: outro.id, nome: outro.nome, confianca: 'alta' };
      }
    }

    // Tentar matching por histórico
    const historicoText = record.historico?.toLowerCase();
    if (historicoText) {
      const { data: historicos } = await supabase
        .from('historico_identificacao')
        .select('*')
        .ilike('historico', `%${historicoText.substring(0, 20)}%`)
        .limit(1);

      if (historicos && historicos.length > 0) {
        return {
          tipo: historicos[0].tipo_cadastro,
          id: historicos[0].cadastro_id,
          nome: historicos[0].cadastro_nome,
          confianca: 'media'
        };
      }
    }

    return null;
  };

  const identifyRecord = async (recordId: string, tipo: string, id: string, nome: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    // Atualizar o registro
    const { error: updateError } = await supabase
      .from('log_extratos')
      .update({
        identificado_tipo: tipo,
        identificado_id: id,
        identificado_nome: nome
      })
      .eq('id', recordId);

    if (updateError) {
      toast.error("Erro ao identificar registro");
      return;
    }

    // Salvar no histórico para aprendizado
    const docClean = record.documento?.replace(/\D/g, '') || '';
    const historicoText = record.historico || '';

    if (docClean || historicoText) {
      await supabase.from('historico_identificacao').insert({
        documento: docClean,
        historico: historicoText,
        tipo_cadastro: tipo,
        cadastro_id: id,
        cadastro_nome: nome
      });
    }

    toast.success("Registro identificado com sucesso");
    loadData();
  };

  const autoIdentifyAll = async () => {
    setLoading(true);
    let identified = 0;

    for (const record of records.filter(r => !r.identificado_nome)) {
      const suggestion = await getSuggestion(record);
      if (suggestion && suggestion.confianca === 'alta') {
        await identifyRecord(record.id, suggestion.tipo, suggestion.id, suggestion.nome);
        identified++;
      }
    }

    toast.success(`${identified} registros identificados automaticamente`);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificar Pagadores e Recebedores</CardTitle>
        <CardDescription>Identifique manualmente ou automaticamente baseado em CPF/CNPJ e histórico</CardDescription>
        <div className="flex gap-2">
          <Button onClick={autoIdentifyAll} disabled={loading}>
            <Check className="w-4 h-4 mr-2" />
            Identificar Automaticamente
          </Button>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Identificação</TableHead>
                  <TableHead className="w-[200px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <IdentifierRow
                    key={record.id}
                    record={record}
                    alunos={alunos}
                    associados={associados}
                    outros={outros}
                    onIdentify={identifyRecord}
                    getSuggestion={getSuggestion}
                  />
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum registro para identificar. Mescle os extratos primeiro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const IdentifierRow = ({ record, alunos, associados, outros, onIdentify, getSuggestion }: any) => {
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!record.identificado_nome) {
      getSuggestion(record).then(setSuggestion);
    }
  }, [record]);

  const handleIdentify = () => {
    if (!selectedTipo || !selectedId) return;

    let nome = '';
    if (selectedTipo === 'aluno') {
      nome = alunos.find((a: any) => a.id === selectedId)?.nome || '';
    } else if (selectedTipo === 'associado') {
      nome = associados.find((a: any) => a.id === selectedId)?.nome || '';
    } else if (selectedTipo === 'outro') {
      nome = outros.find((o: any) => o.id === selectedId)?.nome || '';
    }

    onIdentify(record.id, selectedTipo, selectedId, nome);
  };

  const getOptions = () => {
    if (selectedTipo === 'aluno') return alunos;
    if (selectedTipo === 'associado') return associados;
    if (selectedTipo === 'outro') return outros;
    return [];
  };

  return (
    <TableRow>
      <TableCell>{record.dt_movimento}</TableCell>
      <TableCell className="max-w-xs truncate">{record.historico}</TableCell>
      <TableCell>{record.documento}</TableCell>
      <TableCell className={parseFloat(record.valor) >= 0 ? 'text-green-600' : 'text-red-600'}>
        {record.valor}
      </TableCell>
      <TableCell>
        {record.identificado_nome ? (
          <div>
            <Badge variant="secondary">{record.identificado_tipo}</Badge>
            <p className="text-sm font-medium mt-1">{record.identificado_nome}</p>
          </div>
        ) : suggestion ? (
          <div>
            <Badge variant="outline">Sugestão: {suggestion.confianca}</Badge>
            <p className="text-sm mt-1">{suggestion.nome}</p>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Não identificado</span>
        )}
      </TableCell>
      <TableCell>
        {!record.identificado_nome && (
          <div className="flex gap-1">
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aluno">Aluno</SelectItem>
                <SelectItem value="associado">Associado</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={!selectedTipo}>
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder="Pessoa" />
              </SelectTrigger>
              <SelectContent>
                {getOptions().map((opt: any) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleIdentify} disabled={!selectedId}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};