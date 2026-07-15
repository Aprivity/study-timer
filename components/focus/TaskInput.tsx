import { BookOpen, Code2, Languages, Sigma } from "lucide-react";

export const CATEGORIES = ["数学", "英语", "项目", "阅读", "其他"] as const;

export function TaskInput({ taskName, category, disabled, onTaskChange, onCategoryChange }: {
  taskName: string; category: string; disabled: boolean;
  onTaskChange: (value: string) => void; onCategoryChange: (value: string) => void;
}) {
  return (
    <div className="task-editor">
      <label className="sr-only" htmlFor="focus-task">本次学习任务</label>
      <input id="focus-task" value={taskName} disabled={disabled} maxLength={120}
        onChange={(event) => onTaskChange(event.target.value)} placeholder="准备学习什么？" />
      <div className="category-options" aria-label="任务分类">
        {CATEGORIES.map((item) => (
          <button key={item} type="button" disabled={disabled} aria-pressed={category === item}
            className={category === item ? "selected" : ""} onClick={() => onCategoryChange(item)}>
            {item === "数学" && <Sigma size={14} />}{item === "英语" && <Languages size={14} />}
            {item === "项目" && <Code2 size={14} />}{item === "阅读" && <BookOpen size={14} />}{item}
          </button>
        ))}
      </div>
    </div>
  );
}
