import { Check, Star, X } from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AgentReviews() {
  const query = trpc.agent.listAssignedReviews.useQuery();
  const mutation = trpc.agent.decideAssignedReview.useMutation();
  const decide = async (id: number, decision: "approved" | "rejected") => {
    try {
      await mutation.mutateAsync({ id, decision });
      toast.success(decision === "approved" ? "Você recomendou a aprovação." : "Você recomendou a recusa. A administração fará a análise final.");
      await query.refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar sua decisão."); }
  };
  return <div className="min-h-screen bg-black text-white lg:pl-64"><AgentSidebar /><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <div><p className="text-sm font-semibold uppercase tracking-[.2em] text-gold">Atendimento</p><h1 className="mt-2 text-3xl font-bold">Avaliações dos seus clientes</h1><p className="mt-2 text-gray-400">Faça sua recomendação. A administração sempre realiza a decisão final e pode editar a avaliação.</p></div>
    {(query.data || []).map((review: any) => <Card key={review.id} className="border-gold/20 bg-[#0b1524] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold">{review.name}</h2><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{review.agentDecision === "pending" ? "Aguardando sua análise" : review.agentDecision === "approved" ? "Você recomendou aprovar" : "Você recomendou recusar"}</span></div>
      <div className="my-3 flex gap-1">{[1,2,3,4,5].map(value => <Star key={value} size={19} className={value <= review.rating ? "fill-gold text-gold" : "text-gray-600"} />)}</div><p className="leading-relaxed text-gray-200">“{review.quote}”</p><p className="mt-3 text-sm text-gray-400">{review.city || review.role}{review.state ? `, ${review.state}` : ""}</p></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => decide(review.id, "approved")} className="bg-green-600 hover:bg-green-500"><Check className="mr-2 h-4 w-4" />Recomendar aprovação</Button><Button onClick={() => decide(review.id, "rejected")} className="bg-red-600 hover:bg-red-500"><X className="mr-2 h-4 w-4" />Recomendar recusa</Button></div></div>
    </Card>)}
    {!query.isLoading && !(query.data || []).length && <Card className="border-gold/20 bg-[#0b1524] p-8 text-center text-gray-400">Nenhuma avaliação atribuída a você.</Card>}
  </main></div>;
}
