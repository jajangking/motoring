'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaTachometerAlt, FaShoppingCart, FaCogs, FaGasPump, FaUser } from 'react-icons/fa';

const TabBar = () => {
  const pathname = usePathname();

  // Define tab configuration
  const tabs = [
    {
      name: 'Dasbor',
      path: '/dashboard',
      icon: <FaTachometerAlt className="text-xl" />,
    },
    {
      name: 'Orderan',
      path: '/orders',
      icon: <FaShoppingCart className="text-xl" />,
    },
    {
      name: 'Spareparts',
      path: '/spareparts',
      icon: <FaCogs className="text-xl" />,
    },
    {
      name: 'Isi Bensin',
      path: '/fueling',
      icon: <FaGasPump className="text-xl" />,
    },
    {
      name: 'Profil',
      path: '/profile',
      icon: <FaUser className="text-xl" />,
    },
  ];

  return (
    <nav className="bg-redbull-darker/90 backdrop-blur-md border-t border-redbull-red/40 py-3 fixed bottom-0 left-0 right-0 z-[9999] shadow-lg">
      <div className="max-w-4xl mx-auto px-2">
        <ul className="flex justify-around items-center">
          {tabs.map((tab) => (
            <li key={tab.path} className="flex-1">
              <Link
                href={tab.path}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-300 ${
                  pathname === tab.path
                    ? 'text-redbull-red bg-redbull-red/10 scale-105 shadow-inner'
                    : 'text-gray-300 hover:text-redbull-light hover:bg-redbull-dark/50'
                }`}
              >
                <div className={`mb-1 ${pathname === tab.path ? 'text-redbull-red' : 'text-gray-400'}`}>
                  {tab.icon}
                </div>
                <span className={`text-[0.7rem] sm:text-xs font-medium ${
                  pathname === tab.path ? 'text-redbull-red font-bold' : 'text-gray-400'
                }`}>
                  {tab.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default TabBar;