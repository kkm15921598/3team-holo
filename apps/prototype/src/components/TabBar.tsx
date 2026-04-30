import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import './TabBar.css';

const TABS = [
  { to: '/home', icon: 'home',  label: '홈' },
  { to: '/map',   icon: 'map',   label: '지도' },
  { to: '/board', icon: 'board', label: '게시판' },
  { to: '/chat',  icon: 'chat',  label: '채팅' },
  { to: '/me',    icon: 'user',  label: '마이' },
] as const;

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
