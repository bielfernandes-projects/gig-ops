'use client';

import { Check, X } from 'lucide-react';

type Rule = {
  label: string;
  test: (password: string) => boolean;
};

const rules: Rule[] = [
  { label: 'Mínimo de 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Pelo menos 1 letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Pelo menos 1 letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Pelo menos 1 número', test: (p) => /\d/.test(p) },
  { label: 'Pelo menos 1 caractere especial', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: { password: string }) {
  return (
    <ul className="space-y-1 mt-2">
      {rules.map((rule, index) => {
        const passed = rule.test(password);
        return (
          <li key={index} className="flex items-center gap-2 text-[11px] font-medium transition-all duration-200">
            {passed ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            )}
            <span className={passed ? 'text-emerald-400' : 'text-zinc-500'}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function isPasswordValid(password: string): boolean {
  return rules.every((rule) => rule.test(password));
}
