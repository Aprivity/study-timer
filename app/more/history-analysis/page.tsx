import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { HistoryAnalysisPanel } from "@/components/more/HistoryAnalysisPanel";

export default function HistoryAnalysisPage() {
  return (
    <PageContainer className="history-analysis-page">
      <Link href="/more" className="back-link"><ArrowLeft size={17} />返回更多</Link>
      <div className="page-heading">
        <p className="eyebrow">See your recent rhythm</p>
        <h1 className="page-title">AI 历史专注分析</h1>
        <p className="page-copy">用少量关键数据，看清最近 7 天的专注状态与下一步。</p>
      </div>
      <HistoryAnalysisPanel />
    </PageContainer>
  );
}
