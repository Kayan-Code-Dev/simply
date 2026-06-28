import React, { useState, useEffect, useRef } from 'react';
import { teamApi, adminApi } from '../services/api';
import { useTranslation } from '../utils/useTranslation';
import { useAuthStore } from '../store/authStore';
import { 
  Users, GitFork, Award, Search, Percent, ShieldCheck, 
  Plus, Minus, RefreshCw, ChevronRight, GraduationCap, Lock, Unlock
} from 'lucide-react';

function TreeNode({ node, onToggle, collapsedNodes, rootUserId, searchTerm }) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes[node.id];
  const displayChildren = hasChildren && !isCollapsed;

  const isMatch = searchTerm && (
    node.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.id?.toString() === searchTerm
  );

  const initials = node.name ? node.name.substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex flex-col items-center">
      {/* Node Box */}
      <div className="flex flex-col items-center relative z-10">
        <div className={`h-16 w-16 rounded-full border-2 flex items-center justify-center font-bold text-lg relative transition-all duration-300 ${
          isMatch ? 'ring-4 ring-primary animate-pulse' : ''
        } ${
          node.id === rootUserId
            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/10'
            : node.role === 'STUDENT'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
              : 'bg-blue-500/10 border-blue-500 text-blue-400'
        }`}>
          {/* Badge: Student vs Marketer */}
          {node.role === 'STUDENT' ? (
            <GraduationCap className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-emerald-600 text-white p-0.5 rounded-full border border-emerald-400" title="Student" />
          ) : (
            <Users className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-blue-600 text-white p-0.5 rounded-full border border-blue-400" title="Business Partner" />
          )}
          
          <span className="text-sm font-semibold">{node.id === rootUserId ? 'أنت' : initials}</span>
          
          {/* Active Status dot */}
          <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-dark-card ${
            node.status === 'ACTIVE' || node.role === 'STUDENT' ? 'bg-emerald-500' : 'bg-gray-500'
          }`} title={node.status} />
        </div>
        
        {/* Node Labels */}
        <div className="text-center mt-2.5 space-y-0.5">
          <p className="text-[11px] font-extrabold text-white max-w-[110px] truncate" title={node.id === rootUserId ? 'أنت' : node.name}>
            {node.id === rootUserId ? 'أنت' : node.name}
          </p>
          {node.username && (
            <p className="text-[10px] font-medium text-primary max-w-[110px] truncate" title={`@${node.username}`}>
              @{node.username}
            </p>
          )}
          <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">
            {node.role === 'STUDENT' ? 'Student' : (node.rank || 'Business Partner')}
          </p>
        </div>

        {/* Expand/Collapse Trigger */}
        {hasChildren && (
          <button 
            onClick={() => onToggle(node.id)}
            className="mt-2.5 p-1 bg-dark-bg border border-dark-border text-primary hover:text-white rounded-full transition cursor-pointer relative z-20 hover:scale-105"
          >
            {isCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Vertical line below parent */}
      {displayChildren && (
        <div className="w-0.5 h-6 bg-dark-border" />
      )}

      {/* Children Row */}
      {displayChildren && (
        <div className="flex pt-0 relative">
          {node.children.map((child, index) => {
            const isFirst = index === 0;
            const isLast = index === node.children.length - 1;
            const isOnly = node.children.length === 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center px-4">
                {/* Horizontal line above children */}
                {!isOnly && (
                  <div className={`absolute top-0 h-0.5 bg-dark-border ${
                    isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'
                  }`} />
                )}
                {/* Vertical line above child */}
                <div className="w-0.5 h-6 bg-dark-border" />
                
                <TreeNode 
                  node={child} 
                  onToggle={onToggle} 
                  collapsedNodes={collapsedNodes} 
                  rootUserId={rootUserId} 
                  searchTerm={searchTerm} 
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Team({ view }) {
  const { t, dir } = useTranslation();
  const { user } = useAuthStore();
  const [treeData, setTreeData] = useState(null);
  const [legsData, setLegsData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin Tree traversal states
  const [adminUserList, setAdminUserList] = useState([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSelectedUserId, setAdminSelectedUserId] = useState('');

  // Tree interactive state
  const [scale, setScale] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState({});

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setScale(1);

  const toggleNode = (nodeId) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Canvas panning drag state and handlers
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Only handle left click on canvas or non-button/non-input elements
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    setIsDragging(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      x: canvasRef.current ? canvasRef.current.scrollLeft : 0,
      y: canvasRef.current ? canvasRef.current.scrollTop : 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    canvasRef.current.scrollLeft = scrollStart.x - dx;
    canvasRef.current.scrollTop = scrollStart.y - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch panning handlers for mobile
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setScrollStart({
      x: canvasRef.current ? canvasRef.current.scrollLeft : 0,
      y: canvasRef.current ? canvasRef.current.scrollTop : 0
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    canvasRef.current.scrollLeft = scrollStart.x - dx;
    canvasRef.current.scrollTop = scrollStart.y - dy;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const fetchTeamData = async (targetUserId) => {
    try {
      setLoading(true);
      const treeRes = await teamApi.getTree(targetUserId);
      setTreeData(treeRes.data);
      if (!targetUserId || targetUserId === user?.id) {
        const legsRes = await teamApi.getLegs();
        setLegsData(legsRes.data);
      } else {
        setLegsData(null);
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
    if (user?.role === 'ADMIN') {
      adminApi.getUsers()
        .then((res) => {
          setAdminUserList(res.data || []);
        })
        .catch((err) => console.error('Error fetching users for admin team tree:', err));
    }
  }, [user]);

  const getLevelCap = () => {
    if (!user) return 3;
    if (user.role === 'ADMIN') return 20;
    if (!user.userPackages || user.userPackages.length === 0) return 3;

    let maxCap = 3;
    user.userPackages.forEach(up => {
      const pkgId = up.packageId;
      if (pkgId === 1 && maxCap < 3) maxCap = 3;
      if (pkgId === 2 && maxCap < 5) maxCap = 5;
      if (pkgId === 3 && maxCap < 10) maxCap = 10;
    });
    return maxCap;
  };

  const levelCap = getLevelCap();

  const getTreeHierarchy = () => {
    if (!treeData?.team) return null;

    const rootInfo = treeData.rootUser || user;
    if (!rootInfo) return null;

    const rootNode = {
      id: rootInfo.id,
      name: rootInfo.name,
      username: rootInfo.username,
      email: rootInfo.email,
      role: rootInfo.role,
      status: rootInfo.status || 'ACTIVE',
      rank: rootInfo.rank,
      isRoot: true,
      children: []
    };

    const nodeMap = {
      [rootInfo.id]: rootNode
    };

    treeData.team.forEach(member => {
      if (member.depth > levelCap) return;
      nodeMap[member.id] = {
        ...member,
        children: []
      };
    });

    treeData.team.forEach(member => {
      if (member.depth > levelCap) return;
      const parentId = member.sponsorId;
      if (parentId && nodeMap[parentId]) {
        nodeMap[parentId].children.push(nodeMap[member.id]);
      } else {
        if (parentId === rootInfo.id || !nodeMap[parentId]) {
          nodeMap[rootInfo.id].children.push(nodeMap[member.id]);
        }
      }
    });

    return rootNode;
  };

  const treeHierarchy = getTreeHierarchy();

  // Filter downline based on search query (by ID, Name or Email)
  const filteredTeam = treeData?.team?.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.id.toString() === searchTerm
  ) || [];

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      
      {/* Header */}
      {(!view) && (
        <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
          <h2 className="text-2xl font-bold text-white">{t('teamTitle')}</h2>
          <p className="text-xs text-gray-500 mt-1">{t('teamSubtitle')}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Section 1: Team Legs Performance */}
          {(!view || view === 'legs') && (
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <Percent className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">
                    {legsData?.overallCollectionPercentage || 0}%
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GitFork className="h-5 w-5 text-primary" />
                  <span>{t('legsPerformance')}</span>
                </h3>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {legsData?.legs?.map((leg) => (
                <div key={leg.legUserId} className="bg-dark-bg border border-dark-border rounded-xl md:rounded-2xl p-4 md:p-5 space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full">
                      {leg.legUserRank}
                    </span>
                    <h4 className="font-bold text-white text-sm">{leg.legUserName}</h4>
                  </div>
                  
                  <p className="text-xs text-gray-500 truncate ltr">{leg.legUserEmail}</p>

                  <div className="border-t border-dark-border/50 pt-3 space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{t('earnedTotal')}</span>
                      <span className="font-mono text-white">${leg.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{t('requiredTotal')}</span>
                      <span className="font-mono text-white">${leg.totalRequired.toLocaleString()}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-dark-border rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${Math.min(leg.collectionPercentage, 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{leg.collectionPercentage}% {t('collectedRate')}</span>
                      <span>{t('legPerformanceRatio')}</span>
                    </div>
                  </div>
                </div>
              ))}

              {legsData?.legs?.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-dark-border rounded-2xl">
                  {t('noLegsFound')}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Section 1.5: Team Members List (Network Members) */}
          {(!view || view === 'legs') && (
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl w-full sm:w-80">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent text-white text-sm focus:outline-none"
                  />
                </div>

                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{t('networkMembers') || 'Network Members'}</span>
                </h3>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse" dir={dir}>
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">{t('tableId') || 'ID'}</th>
                      <th className="pb-3 text-start">{t('tableName') || 'Full Name'}</th>
                      <th className="pb-3 text-start">{t('tableEmail') || 'Email Address'}</th>
                      <th className="pb-3 text-start">{t('tableRole') || 'Account Type'}</th>
                      <th className="pb-3 text-center">{t('tableLevel') || 'Level'}</th>
                      <th className="pb-3 text-center">{t('tableRank') || 'Rank'}</th>
                      <th className="pb-3 text-end">{t('tableTotalPaid') || 'Total Collected'}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300">
                    {filteredTeam.map((member) => (
                      <tr key={member.id} className="hover:bg-white/5 transition-all duration-150">
                        <td className="py-3 font-mono text-xs text-start">{member.id}</td>
                        <td className="py-3 font-semibold text-white text-start">{member.name}</td>
                        <td className="py-3 text-start ltr">{member.email}</td>
                        <td className="py-3 text-start">
                          <span className={`px-2 py-0.5 text-xs rounded-lg ${
                            member.role === 'STUDENT' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {member.role === 'STUDENT' ? t('studentRoleLabel') : t('marketerRoleLabel')}
                          </span>
                        </td>
                        <td className="py-3 text-center font-bold text-primary">L{member.depth}</td>
                        <td className="py-3 text-center font-bold text-xs">{member.rank}</td>
                        <td className="py-3 text-end font-semibold text-white font-mono">
                          ${member.totalPaid.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {filteredTeam.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500">
                          {t('noMembersFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Interactive Downline Tree (Genealogy Organogram) */}
          {(!view || view === 'tree') && (
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
              
              {/* Header with Search and Filter bar */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl w-full sm:w-80">
                    <Search className="h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder={t('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-white text-sm focus:outline-none"
                    />
                  </div>

                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <GitFork className="h-5 w-5 text-primary rotate-90" />
                    <span>{t('teamTree')}</span>
                  </h3>
                </div>

                {/* Filter Label */}
                <div className="flex items-center justify-center gap-2 bg-dark-bg/60 border border-dark-border px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-gray-400 font-semibold text-sm">
                  <Search className="h-4 w-4 text-primary" />
                  <span>تصفية Members</span>
                </div>
              </div>

              {/* Admin Tree Inspector */}
              {user?.role === 'ADMIN' && (
                <div className="bg-dark-bg/40 border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-5 space-y-3 md:space-y-4">
                  <h4 className="text-sm font-bold text-white">إدارة تصفح شجرة الأعضاء (Admin Tree Inspector)</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-2 bg-dark-card border border-dark-border px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl">
                        <Search className="h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="ابحث عن اسم المستخدم، الاسم، أو البريد الإلكتروني للعضو..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-white text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      
                      {adminSearchQuery.trim() !== '' && (
                        <div className="absolute left-0 right-0 mt-2 max-h-48 overflow-y-auto border border-dark-border rounded-2xl bg-dark-card divide-y divide-dark-border/40 z-50 shadow-2xl">
                          {adminUserList
                            .filter(u => 
                              u.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                              u.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                              u.username?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setAdminSelectedUserId(u.id);
                                  setAdminSearchQuery(`${u.name} (@${u.username})`);
                                  fetchTeamData(u.id);
                                }}
                                className="p-3 text-xs text-gray-300 hover:bg-white/5 cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <span className="font-bold block text-white text-start">{u.name}</span>
                                  <span className="text-gray-500 font-mono text-[10px] block text-start">{u.email} | @{u.username}</span>
                                </div>
                                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase font-bold">
                                  {u.role}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    
                    {adminSelectedUserId && (
                      <button
                        onClick={() => {
                          setAdminSelectedUserId('');
                          setAdminSearchQuery('');
                          fetchTeamData();
                        }}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-2xl transition cursor-pointer shrink-0"
                      >
                        إعادة تعيين إلى الجذر
                      </button>
                    )}
                  </div>
                  {treeData?.rootUser && (
                    <div className="text-xs text-gray-400 font-semibold text-start">
                      تصفح شجرة العضو حالياً: <span className="text-primary">{treeData.rootUser.name}</span> (@{treeData.rootUser.username}) - ID: #{treeData.rootUser.id}
                    </div>
                  )}
                </div>
              )}

              {/* Horizontal Scrollable Level Stats cards */}
              <div className="overflow-x-auto pb-4 scrollbar-thin">
                <div className="flex gap-4 min-w-max">
                  {Array.from({ length: 20 }, (_, i) => {
                    const lvl = i + 1;
                    const isLocked = lvl > levelCap;
                    const count = treeData?.team?.filter(m => m.depth === lvl).length || 0;
                    
                    const unlockedBadges = [
                      'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/10',
                      'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/10',
                      'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/10',
                      'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/10',
                      'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/10',
                      'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/10',
                      'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/10'
                    ];
                    
                    const badgeClass = isLocked 
                      ? 'bg-dark-bg border-dark-border text-gray-500' 
                      : unlockedBadges[(lvl - 1) % unlockedBadges.length];

                    return (
                      <div key={lvl} className={`flex flex-col items-center justify-between border rounded-2xl p-4 w-24 transition duration-200 ${
                        isLocked 
                          ? 'bg-dark-bg/20 border-dark-border/40 text-gray-500' 
                          : 'bg-dark-bg border-dark-border hover:border-primary/50 text-white'
                      }`}>
                        <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs ${badgeClass}`}>
                          {lvl}
                        </div>
                        {isLocked ? (
                          <div className="flex flex-col items-center mt-2.5 space-y-1">
                            <span className="font-mono text-sm font-bold text-gray-500">{count}</span>
                            <Lock className="h-3.5 w-3.5 text-gray-600" />
                          </div>
                        ) : (
                          <span className="font-mono text-base font-extrabold text-white mt-2.5">{count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Team KPI Card */}
              <div className="bg-dark-bg border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-5 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-primary shadow-lg shadow-indigo-500/5">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Total Team</p>
                    <h4 className="text-2xl font-black text-white font-mono mt-0.5">{treeData?.team?.length || 0}</h4>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Active Members</p>
                  <h4 className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                    {treeData?.team?.filter(m => m.status === 'ACTIVE' || m.role === 'STUDENT').length || 0}
                  </h4>
                </div>
              </div>

              {/* Visual Tree Canvas Container */}
              <div className="relative border border-dark-border rounded-2xl md:rounded-3xl bg-dark-bg/30 p-2 md:p-4 shadow-inner overflow-hidden">
                
                {/* Floating Canvas Controls */}
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-dark-card/90 backdrop-blur-md border border-dark-border px-3 py-1.5 rounded-2xl shadow-lg">
                  <button 
                    onClick={handleZoomOut} 
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-white px-1 select-none">
                    {Math.round(scale * 100)}%
                  </span>
                  <button 
                    onClick={handleZoomIn} 
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                    title="Zoom In"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <div className="w-px h-4 bg-dark-border mx-1" />
                  <button 
                    onClick={handleResetZoom} 
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                    title="Reset Zoom"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Drag-to-scroll Outer Container */}
                <div 
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`w-full h-[600px] overflow-auto p-4 md:p-16 flex justify-center items-start select-none ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                >
                  {/* Scaled Tree Hierarchy */}
                  <div 
                    className="transition-transform duration-150 ease-out origin-top flex justify-center pt-8"
                    style={{ transform: `scale(${scale})` }}
                  >
                    {treeHierarchy ? (
                      <TreeNode 
                        node={treeHierarchy} 
                        onToggle={toggleNode} 
                        collapsedNodes={collapsedNodes} 
                        rootUserId={user.id} 
                        searchTerm={searchTerm} 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500">
                        <Users className="h-12 w-12 text-gray-600 mb-3" />
                        <p className="text-sm font-semibold">No tree data found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
