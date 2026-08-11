import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

export default function MorePage() {
  return (
    <PageContainer className="more-page">
      <Link href="/" className="back-link"><ArrowLeft size={17} />返回计时器</Link>
      <div className="page-heading">
        <p className="eyebrow">Extend your focus</p>
        <h1 className="page-title more-page-title">更多</h1>
        <p className="page-copy">在保持专注界面安静的同时，把需要时才使用的能力放在这里。</p>
      </div>

      <section className="feature-list" aria-label="扩展功能">
        <Link className="feature-row" href="/more/plan-image">
          <span className="feature-icon" aria-hidden="true"><Sparkles /></span>
          <span className="feature-copy">
            <strong>AI 计划图</strong>
            <small>将学习或工作计划生成清晰的执行图</small>
          </span>
          <ArrowUpRight className="feature-arrow" aria-hidden="true" />
        </Link>

        <div className="feature-row feature-row-disabled" aria-disabled="true">
          <span className="feature-icon" aria-hidden="true"><BarChart3 /></span>
          <span className="feature-copy">
            <strong>AI 历史专注分析</strong>
            <small>根据历史记录分析学习状态</small>
          </span>
          <span className="feature-status">即将推出</span>
        </div>
      </section>
    </PageContainer>
  );
}
