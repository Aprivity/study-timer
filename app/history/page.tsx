import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HistoryDashboard } from "@/components/history/HistoryDashboard";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HistoryPage() {
  return <PageContainer className="history-page"><Link href="/" className="back-link"><ArrowLeft size={17} />返回计时器</Link><div className="page-heading"><p className="eyebrow">Your quiet progress</p><h1 className="page-title">专注历史</h1><p className="page-copy">从每一次安静投入，到逐渐清晰的学习轨迹。</p></div><HistoryDashboard /></PageContainer>;
}
