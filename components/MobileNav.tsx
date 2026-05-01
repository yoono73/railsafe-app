'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '홈',    icon: '🏠', href: '/dashboard'  },
  { label: '이론',  icon: '📚', href: '/theory/1'   },
  { label: '스토리', icon: '📖', href: '/story'      },
  { label: 'CBT',   icon: '📝', href: '/cbt/1'      },
  { label: '인출',  icon: '🧠', href: '/retrieval'   },
  { label: '오답',  icon: '📒', href: '/wronganswers'},
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center justify-around px-2 h-14 safe-bottom">
      {navItems.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href.replace(/\/\d+$/, ''));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors ${
              isActive ? 'text-purple-700' : 'text-gray-400'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className={`text-[9px] font-medium ${isActive ? 'text-purple-700' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
