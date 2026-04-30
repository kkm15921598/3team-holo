type IconName =
  | 'search' | 'bell' | 'sparkles' | 'plus' | 'arrow-right' | 'arrow-up-right'
  | 'home' | 'map' | 'board' | 'chat' | 'user'
  | 'check' | 'chevron-right' | 'chevron-left' | 'lock' | 'refresh' | 'send'
  | 'menu';

type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 22, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    case 'search':
      return (<svg {...common}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
    case 'bell':
      return (<svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" /><path d="M9 21a3 3 0 0 0 6 0" /></svg>);
    case 'sparkles':
      return (<svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>);
    case 'plus':
      return (<svg {...common}><path d="M12 5v14M5 12h14" /></svg>);
    case 'arrow-right':
      return (<svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>);
    case 'arrow-up-right':
      return (<svg {...common}><path d="M7 17 17 7M8 7h9v9" /></svg>);
    case 'home':
      return (<svg {...common}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" /></svg>);
    case 'map':
      return (<svg {...common}><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v16M15 6v16" /></svg>);
    case 'board':
      return (<svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 12h6M9 17h4" /></svg>);
    case 'chat':
      return (<svg {...common}><path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3.5-.6L3 21l1.6-4.5A7.7 7.7 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" /></svg>);
    case 'user':
      return (<svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
    case 'check':
      return (<svg {...common}><path d="m5 13 4 4L19 7" /></svg>);
    case 'chevron-right':
      return (<svg {...common}><path d="m9 6 6 6-6 6" /></svg>);
    case 'chevron-left':
      return (<svg {...common}><path d="m15 6-6 6 6 6" /></svg>);
    case 'lock':
      return (<svg {...common}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 1 1 8 0v3" /></svg>);
    case 'refresh':
      return (<svg {...common}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" /></svg>);
    case 'send':
      return (<svg {...common}><path d="m5 12 14-7-5 14-3-6-6-1Z" /></svg>);
    case 'menu':
      return (<svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
  }
}
