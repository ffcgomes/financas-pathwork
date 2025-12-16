import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Pencil } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  formacao?: string;
  turma?: string;
  inicio?: string;
  cpf?: string;
  fone?: string;
  email?: string;
  profissao?: string;
  nascimento?: string;
}

interface Associado {
  id: string;
  nome: string;
  status?: string;
  observacoes?: string;
}

interface Outro {
  id: string;
  nome: string;
  tipo: string;
  cpf_cnpj?: string;
  observacoes?: string;
}

export const CadastroManager = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [outros, setOutros] = useState<Outro[]>([]);

  const [novoAluno, setNovoAluno] = useState<Partial<Aluno>>({});
  const [novoAssociado, setNovoAssociado] = useState<Partial<Associado>>({});
  const [novoOutro, setNovoOutro] = useState<Partial<Outro>>({});

  const [editAlunoOpen, setEditAlunoOpen] = useState(false);
  const [editAssociadoOpen, setEditAssociadoOpen] = useState(false);
  const [editOutroOpen, setEditOutroOpen] = useState(false);

  const [editAluno, setEditAluno] = useState<Aluno | null>(null);
  const [editAssociado, setEditAssociado] = useState<Associado | null>(null);
  const [editOutro, setEditOutro] = useState<Outro | null>(null);

  useEffect(() => {
    loadCadastros();
  }, []);

  const loadCadastros = async () => {
    const [alunosRes, associadosRes, outrosRes] = await Promise.all([
      supabase.from('cadastro_alunos').select('*').order('nome'),
      supabase.from('cadastro_associados').select('*').order('nome'),
      supabase.from('cadastro_outros').select('*').order('nome')
    ]);

    if (alunosRes.data) setAlunos(alunosRes.data);
    if (associadosRes.data) setAssociados(associadosRes.data);
    if (outrosRes.data) setOutros(outrosRes.data);
  };

  const addAluno = async () => {
    if (!novoAluno.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    const { error } = await supabase.from('cadastro_alunos').insert([{ ...novoAluno, nome: novoAluno.nome }]);
    if (error) {
      toast.error("Erro ao adicionar aluno");
      console.error(error);
    } else {
      toast.success("Aluno adicionado com sucesso");
      setNovoAluno({});
      loadCadastros();
    }
  };

  const addAssociado = async () => {
    if (!novoAssociado.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    const { error } = await supabase.from('cadastro_associados').insert([{ ...novoAssociado, nome: novoAssociado.nome }]);
    if (error) {
      toast.error("Erro ao adicionar associado");
      console.error(error);
    } else {
      toast.success("Associado adicionado com sucesso");
      setNovoAssociado({});
      loadCadastros();
    }
  };

  const addOutro = async () => {
    if (!novoOutro.nome || !novoOutro.tipo) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    const { error } = await supabase.from('cadastro_outros').insert([{ ...novoOutro, nome: novoOutro.nome, tipo: novoOutro.tipo }]);
    if (error) {
      toast.error("Erro ao adicionar cadastro");
      console.error(error);
    } else {
      toast.success("Cadastro adicionado com sucesso");
      setNovoOutro({});
      loadCadastros();
    }
  };

  const deleteAluno = async (id: string) => {
    const { error } = await supabase.from('cadastro_alunos').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir aluno");
    } else {
      toast.success("Aluno excluído");
      loadCadastros();
    }
  };

  const deleteAssociado = async (id: string) => {
    const { error } = await supabase.from('cadastro_associados').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir associado");
    } else {
      toast.success("Associado excluído");
      loadCadastros();
    }
  };

  const deleteOutro = async (id: string) => {
    const { error } = await supabase.from('cadastro_outros').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir cadastro");
    } else {
      toast.success("Cadastro excluído");
      loadCadastros();
    }
  };

  const updateAluno = async () => {
    if (!editAluno?.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    const { error } = await supabase.from('cadastro_alunos').update(editAluno).eq('id', editAluno.id);
    if (error) {
      toast.error("Erro ao atualizar aluno");
      console.error(error);
    } else {
      toast.success("Aluno atualizado com sucesso");
      setEditAlunoOpen(false);
      setEditAluno(null);
      loadCadastros();
    }
  };

  const updateAssociado = async () => {
    if (!editAssociado?.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    const { error } = await supabase.from('cadastro_associados').update(editAssociado).eq('id', editAssociado.id);
    if (error) {
      toast.error("Erro ao atualizar associado");
      console.error(error);
    } else {
      toast.success("Associado atualizado com sucesso");
      setEditAssociadoOpen(false);
      setEditAssociado(null);
      loadCadastros();
    }
  };

  const updateOutro = async () => {
    if (!editOutro?.nome || !editOutro?.tipo) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    const { error } = await supabase.from('cadastro_outros').update(editOutro).eq('id', editOutro.id);
    if (error) {
      toast.error("Erro ao atualizar cadastro");
      console.error(error);
    } else {
      toast.success("Cadastro atualizado com sucesso");
      setEditOutroOpen(false);
      setEditOutro(null);
      loadCadastros();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Cadastros</CardTitle>
        <CardDescription>Cadastre pagadores e recebedores para identificação automática</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alunos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            <TabsTrigger value="associados">Associados</TabsTrigger>
            <TabsTrigger value="outros">Outros</TabsTrigger>
          </TabsList>

          <TabsContent value="alunos" className="space-y-4">
            <div className="grid gap-4 border rounded-lg p-4 bg-muted/20">
              <h3 className="font-semibold">Adicionar Novo Aluno</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aluno-nome">Nome *</Label>
                  <Input
                    id="aluno-nome"
                    value={novoAluno.nome || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aluno-cpf">CPF</Label>
                  <Input
                    id="aluno-cpf"
                    value={novoAluno.cpf || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aluno-formacao">Formação</Label>
                  <Input
                    id="aluno-formacao"
                    value={novoAluno.formacao || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, formacao: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aluno-turma">Turma</Label>
                  <Input
                    id="aluno-turma"
                    value={novoAluno.turma || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, turma: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aluno-email">Email</Label>
                  <Input
                    id="aluno-email"
                    type="email"
                    value={novoAluno.email || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="aluno-fone">Telefone</Label>
                  <Input
                    id="aluno-fone"
                    value={novoAluno.fone || ''}
                    onChange={(e) => setNovoAluno({ ...novoAluno, fone: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addAluno} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Aluno
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">{aluno.nome}</TableCell>
                      <TableCell>{aluno.cpf || '-'}</TableCell>
                      <TableCell>{aluno.turma || '-'}</TableCell>
                      <TableCell>{aluno.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditAluno(aluno);
                              setEditAlunoOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAluno(aluno.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {alunos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum aluno cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="associados" className="space-y-4">
            <div className="grid gap-4 border rounded-lg p-4 bg-muted/20">
              <h3 className="font-semibold">Adicionar Novo Associado</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="assoc-nome">Nome *</Label>
                  <Input
                    id="assoc-nome"
                    value={novoAssociado.nome || ''}
                    onChange={(e) => setNovoAssociado({ ...novoAssociado, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="assoc-status">Status</Label>
                  <Input
                    id="assoc-status"
                    value={novoAssociado.status || ''}
                    onChange={(e) => setNovoAssociado({ ...novoAssociado, status: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="assoc-obs">Observações</Label>
                  <Textarea
                    id="assoc-obs"
                    value={novoAssociado.observacoes || ''}
                    onChange={(e) => setNovoAssociado({ ...novoAssociado, observacoes: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addAssociado} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Associado
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associados.map((assoc) => (
                    <TableRow key={assoc.id}>
                      <TableCell className="font-medium">{assoc.nome}</TableCell>
                      <TableCell>{assoc.status || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{assoc.observacoes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditAssociado(assoc);
                              setEditAssociadoOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAssociado(assoc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {associados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum associado cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="outros" className="space-y-4">
            <div className="grid gap-4 border rounded-lg p-4 bg-muted/20">
              <h3 className="font-semibold">Adicionar Outro Pagador/Recebedor</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="outro-nome">Nome *</Label>
                  <Input
                    id="outro-nome"
                    value={novoOutro.nome || ''}
                    onChange={(e) => setNovoOutro({ ...novoOutro, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="outro-tipo">Tipo * (ex: Contador, Energia, Água)</Label>
                  <Input
                    id="outro-tipo"
                    value={novoOutro.tipo || ''}
                    onChange={(e) => setNovoOutro({ ...novoOutro, tipo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="outro-cpf">CPF/CNPJ</Label>
                  <Input
                    id="outro-cpf"
                    value={novoOutro.cpf_cnpj || ''}
                    onChange={(e) => setNovoOutro({ ...novoOutro, cpf_cnpj: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="outro-obs">Observações</Label>
                  <Textarea
                    id="outro-obs"
                    value={novoOutro.observacoes || ''}
                    onChange={(e) => setNovoOutro({ ...novoOutro, observacoes: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addOutro} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cadastro
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outros.map((outro) => (
                    <TableRow key={outro.id}>
                      <TableCell className="font-medium">{outro.nome}</TableCell>
                      <TableCell>{outro.tipo}</TableCell>
                      <TableCell>{outro.cpf_cnpj || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{outro.observacoes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditOutro(outro);
                              setEditOutroOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOutro(outro.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {outros.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum cadastro adicionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog para editar Aluno */}
      <Dialog open={editAlunoOpen} onOpenChange={setEditAlunoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Edite todas as informações do aluno</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-aluno-nome">Nome *</Label>
              <Input
                id="edit-aluno-nome"
                value={editAluno?.nome || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, nome: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-cpf">CPF</Label>
              <Input
                id="edit-aluno-cpf"
                value={editAluno?.cpf || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, cpf: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-formacao">Formação</Label>
              <Input
                id="edit-aluno-formacao"
                value={editAluno?.formacao || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, formacao: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-turma">Turma</Label>
              <Input
                id="edit-aluno-turma"
                value={editAluno?.turma || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, turma: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-inicio">Início</Label>
              <Input
                id="edit-aluno-inicio"
                type="date"
                value={editAluno?.inicio || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, inicio: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-nascimento">Nascimento</Label>
              <Input
                id="edit-aluno-nascimento"
                type="date"
                value={editAluno?.nascimento || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, nascimento: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-email">Email</Label>
              <Input
                id="edit-aluno-email"
                type="email"
                value={editAluno?.email || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, email: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aluno-fone">Telefone</Label>
              <Input
                id="edit-aluno-fone"
                value={editAluno?.fone || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, fone: e.target.value } : null)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-aluno-profissao">Profissão</Label>
              <Input
                id="edit-aluno-profissao"
                value={editAluno?.profissao || ''}
                onChange={(e) => setEditAluno(editAluno ? { ...editAluno, profissao: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAlunoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateAluno}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar Associado */}
      <Dialog open={editAssociadoOpen} onOpenChange={setEditAssociadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Associado</DialogTitle>
            <DialogDescription>Edite todas as informações do associado</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="edit-assoc-nome">Nome *</Label>
              <Input
                id="edit-assoc-nome"
                value={editAssociado?.nome || ''}
                onChange={(e) => setEditAssociado(editAssociado ? { ...editAssociado, nome: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-assoc-status">Status</Label>
              <Input
                id="edit-assoc-status"
                value={editAssociado?.status || ''}
                onChange={(e) => setEditAssociado(editAssociado ? { ...editAssociado, status: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-assoc-obs">Observações</Label>
              <Textarea
                id="edit-assoc-obs"
                value={editAssociado?.observacoes || ''}
                onChange={(e) => setEditAssociado(editAssociado ? { ...editAssociado, observacoes: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAssociadoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateAssociado}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar Outro */}
      <Dialog open={editOutroOpen} onOpenChange={setEditOutroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cadastro</DialogTitle>
            <DialogDescription>Edite todas as informações do cadastro</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="edit-outro-nome">Nome *</Label>
              <Input
                id="edit-outro-nome"
                value={editOutro?.nome || ''}
                onChange={(e) => setEditOutro(editOutro ? { ...editOutro, nome: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-outro-tipo">Tipo *</Label>
              <Input
                id="edit-outro-tipo"
                value={editOutro?.tipo || ''}
                onChange={(e) => setEditOutro(editOutro ? { ...editOutro, tipo: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-outro-cpf">CPF/CNPJ</Label>
              <Input
                id="edit-outro-cpf"
                value={editOutro?.cpf_cnpj || ''}
                onChange={(e) => setEditOutro(editOutro ? { ...editOutro, cpf_cnpj: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="edit-outro-obs">Observações</Label>
              <Textarea
                id="edit-outro-obs"
                value={editOutro?.observacoes || ''}
                onChange={(e) => setEditOutro(editOutro ? { ...editOutro, observacoes: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOutroOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateOutro}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};