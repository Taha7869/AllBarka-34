import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Package, MapPin, Phone, Crown, LogOut, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PatronLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PatronLoungeModal({ isOpen, onClose }: PatronLoungeModalProps) {
  const { currentUser, patronProfile, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchLoyalty = async () => {
        try {
          const { REWARDS } = await import('../data/rewards');
          setRewards(REWARDS);
          
          const [{ doc, getDoc, collection, query, orderBy, limit, getDocs, where }, { db }] = await Promise.all([
            import('firebase/firestore'),
            import('../lib/firebase')
          ]);
          
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const loyaltyPoints = userDoc.exists() ? (userDoc.data()?.loyaltyPoints || 0) : 0;
          
          const txSnap = await getDocs(query(collection(db, "users", currentUser.uid, "loyaltyTransactions"), orderBy("createdAt", "desc"), limit(10)));
          const transactions = txSnap.docs.map(d => d.data());
          
          const arSnap = await getDocs(query(collection(db, "users", currentUser.uid, "activeRewards"), where("status", "==", "ACTIVE")));
          const activeRewards = arSnap.docs.map(d => d.data());
          
          setLoyaltyData({ loyaltyPoints, transactions, activeRewards });
        } catch (e) {
          console.error('Failed to fetch loyalty:', e);
        }
      };
      fetchLoyalty();
    }
  }, [isOpen, currentUser]);

  const handleRedeem = async (rewardId: string) => {
    if (!currentUser) return;
    setRedeeming(rewardId);
    try {
      const { REWARDS } = await import('../data/rewards');
      const reward = REWARDS.find(r => r.rewardId === rewardId);
      if (!reward || !reward.active) throw new Error("Invalid reward");
      
      const [{ doc, runTransaction, collection }, { db }] = await Promise.all([
        import('firebase/firestore'),
        import('../lib/firebase')
      ]);
      
      let newActiveReward = null;
      
      await runTransaction(db, async (t) => {
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await t.get(userRef);
          
          const currentPoints = userDoc.exists() ? (userDoc.data()?.loyaltyPoints || 0) : 0;
          if (currentPoints < reward.pointsCost) throw new Error("Insufficient points");
          
          // Generate a pseudo-random ID since we can't easily import crypto or use doc() inside transaction for auto-id
          const txId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          const arId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          
          const txRef = doc(db, "users", currentUser.uid, "loyaltyTransactions", txId);
          const arRef = doc(db, "users", currentUser.uid, "activeRewards", arId);
          
          t.set(userRef, { loyaltyPoints: currentPoints - reward.pointsCost }, { merge: true });
          
          t.set(txRef, {
              transactionId: txId,
              type: 'REDEEM',
              points: -reward.pointsCost,
              rewardId: reward.rewardId,
              description: `Redeemed ${reward.name}`,
              createdAt: Date.now()
          });
          
          newActiveReward = {
              rewardId: reward.rewardId,
              claimedAt: Date.now(),
              expiresAt: Date.now() + (reward.expiryDays * 24 * 60 * 60 * 1000),
              status: 'ACTIVE',
              rewardType: reward.rewardType
          };
          t.set(arRef, newActiveReward);
      });
      
      alert('Reward redeemed successfully! It will be applied to your next eligible order.');
      
      // Refresh local state
      setLoyaltyData((prev: any) => ({
          ...prev,
          loyaltyPoints: Math.max(0, (prev?.loyaltyPoints || 0) - reward.pointsCost),
          activeRewards: [newActiveReward],
          transactions: [{
              transactionId: Date.now().toString(),
              type: 'REDEEM',
              points: -reward.pointsCost,
              rewardId: reward.rewardId,
              description: `Redeemed ${reward.name}`,
              createdAt: Date.now()
          }, ...(prev?.transactions || [])].slice(0, 10)
      }));
      
    } catch(e: any) {
       console.error(e);
       alert(e.message || 'An error occurred.');
    } finally {
       setRedeeming(null);
    }
  };



  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const [{ query, collection, where, getDocs }, { db }] = await Promise.all([
            import('firebase/firestore'),
            import('../lib/firebase')
          ]);
          const q = query(
            collection(db, 'orders'),
            where('uid', '==', currentUser.uid)
            // Note: In production you might need an index for orderBy('timestamp', 'desc')
          );
          const snap = await getDocs(q);
          const fetched = snap.docs.map(doc => doc.data());
          // Client-side sort if no composite index
          fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setOrders(fetched);
        } catch (error) {
          console.error("Failed to fetch orders:", error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PACKED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'OUT FOR DELIVERY': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-[24px] shadow-[0_24px_60px_rgba(31,18,15,0.22),0_0_32px_rgba(184,147,95,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/50 flex items-center justify-center text-[var(--color-gold,#B8935F)] shadow-xs">
              <Crown size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] leading-tight">
                Patron Lounge
              </h3>
              <p className="text-[9.5px] font-bold tracking-widest uppercase text-[var(--color-gold,#B8935F)] mt-0.5">
                VIP Access Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#FDFBF7] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sidebar: Profile */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-5 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[var(--color-ink,#1F120F)] border-2 border-[var(--color-gold,#B8935F)] flex items-center justify-center text-[var(--color-gold,#B8935F)] mb-4 shadow-md">
                  <User size={28} />
                </div>
                <h4 className="text-xl font-serif font-black text-[var(--color-ink,#1F120F)]">
                  {patronProfile?.name || 'Patron Member'}
                </h4>
                <p className="text-xs font-bold text-[var(--color-gold,#B8935F)] uppercase tracking-wider mb-4">
                  {patronProfile?.patronStatus || 'VIP Patron'}
                </p>
                
                <div className="space-y-3 pt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                  <div className="flex items-center gap-3 text-sm text-[var(--color-ink,#1F120F)]/80">
                    <User size={16} className="text-[var(--color-gold,#B8935F)]" />
                    <span className="font-medium">{currentUser?.email}</span>
                  </div>
                  {patronProfile?.phone && (
                    <div className="flex items-center gap-3 text-sm text-[var(--color-ink,#1F120F)]/80">
                      <Phone size={16} className="text-[var(--color-gold,#B8935F)]" />
                      <span className="font-medium">{patronProfile.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                  <button 
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl border border-[var(--color-ink,#1F120F)]/20 text-[var(--color-ink,#1F120F)] hover:bg-[var(--color-ink,#1F120F)]/5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    Secure Sign Out
                  </button>
                </div>
              </div>
            </div>

            
              {/* Patron Rewards Section */}
              <div className="bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-5 shadow-sm mt-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)] flex items-center gap-2 mb-4">
                  <Crown size={16} className="text-[var(--color-gold,#B8935F)]" />
                  Patron Rewards
                </h4>
                
                <div className="mb-4">
                  <p className="text-xs text-[var(--color-ink,#1F120F)]/60 font-bold uppercase tracking-wider mb-1">Available Points</p>
                  <p className="text-3xl font-serif font-black text-[var(--color-gold,#B8935F)]">{loyaltyData?.loyaltyPoints || 0}</p>
                </div>

                {loyaltyData?.activeRewards && loyaltyData.activeRewards.length > 0 && (
                  <div className="mb-6 p-3 bg-[var(--color-gold,#B8935F)]/10 border border-[var(--color-gold,#B8935F)]/20 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)] mb-1">Active Reward</p>
                    <p className="text-sm font-bold text-[var(--color-ink,#1F120F)]">
                      {rewards.find((r: any) => r.rewardId === loyaltyData.activeRewards[0].rewardId)?.name || 'Reward Active'}
                    </p>
                    <p className="text-[10px] text-[var(--color-ink,#1F120F)]/70 mt-1">Ready for your next order.</p>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/70">Exchange Options</p>
                  {rewards.filter((r: any) => r.active).map((reward: any) => {
                    const canAfford = (loyaltyData?.loyaltyPoints || 0) >= reward.pointsCost;
                    const hasActive = loyaltyData?.activeRewards && loyaltyData.activeRewards.length > 0;
                    return (
                      <div key={reward.rewardId} className="border border-[var(--color-ink,#1F120F)]/10 rounded-xl p-3">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-[var(--color-ink,#1F120F)]">{reward.name}</p>
                          <span className="text-[10px] font-black text-[var(--color-gold,#B8935F)] bg-[var(--color-gold,#B8935F)]/10 px-1.5 py-0.5 rounded">{reward.pointsCost} pts</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 leading-snug mb-2">{reward.description}</p>
                        <button
                          onClick={() => handleRedeem(reward.rewardId)}
                          disabled={!canAfford || hasActive || redeeming === reward.rewardId}
                          className="w-full py-1.5 rounded-lg border border-[var(--color-gold,#B8935F)]/30 text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-gold,#B8935F)] hover:text-white text-[var(--color-ink,#1F120F)]"
                        >
                          {redeeming === reward.rewardId ? 'Redeeming...' : (hasActive ? 'Reward Pending' : (canAfford ? 'Redeem' : 'Not Enough Points'))}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {loyaltyData?.transactions && loyaltyData.transactions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/70 mb-2">Recent Activity</p>
                    <div className="space-y-2">
                      {loyaltyData.transactions.slice(0, 3).map((tx: any) => (
                        <div key={tx.transactionId} className="flex justify-between items-center text-[10px]">
                          <span className="text-[var(--color-ink,#1F120F)]/70 truncate mr-2">{tx.description}</span>
                          <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-[var(--color-ink,#1F120F)]'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
{/* Main Content: Orders */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-[var(--color-ink,#1F120F)] flex items-center gap-2 mb-2">
                <Package size={16} className="text-[var(--color-gold,#B8935F)]" />
                Order History
              </h4>

              {loadingOrders ? (
                <div className="py-12 flex items-center justify-center text-[var(--color-gold,#B8935F)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-gold,#B8935F)]"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white border border-[var(--color-gold,#B8935F)]/20 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-gold,#B8935F)]/10 mx-auto flex items-center justify-center mb-4">
                    <Package size={24} className="text-[var(--color-gold,#B8935F)]" />
                  </div>
                  <h5 className="font-serif font-black text-lg text-[var(--color-ink,#1F120F)] mb-2">
                    No orders yet
                  </h5>
                  <p className="text-sm text-[var(--color-ink,#1F120F)]/60 max-w-xs mx-auto">
                    Your exclusive AllBarka selections will appear here securely.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.orderId} className="bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="px-5 py-4 border-b border-[var(--color-gold,#B8935F)]/20 bg-[#FDFBF7]/50 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Order ID</p>
                          <p className="font-mono text-sm font-bold text-[var(--color-ink,#1F120F)]">{order.orderId}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Placed On</p>
                          <p className="text-sm font-medium text-[var(--color-ink,#1F120F)] flex items-center gap-1.5">
                            <Calendar size={13} className="text-[var(--color-gold,#B8935F)]" />
                            {new Date(order.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[var(--color-ink,#1F120F)]/60 mb-0.5">Total</p>
                          <p className="font-serif font-black text-[var(--color-ink,#1F120F)]">Rs. {order.total?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <div className="space-y-3">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--color-ink,#1F120F)]">{item.name}</span>
                                <span className="text-xs text-[var(--color-ink,#1F120F)]/60 border border-[var(--color-ink,#1F120F)]/10 rounded px-1.5 bg-gray-50">{item.selectedWeight}</span>
                                <span className="text-xs font-bold text-[var(--color-gold,#B8935F)]">x{item.quantity}</span>
                              </div>
                              <span className="font-medium text-[var(--color-ink,#1F120F)]">Rs. {(item.price * item.quantity)?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        {(order.discount > 0 || order.shipping > 0 || order.giftWrap > 0) && (
                          <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-gold,#B8935F)]/30 space-y-1.5 text-xs">
                            {order.discount > 0 && (
                              <div className="flex justify-between text-[var(--color-gold,#B8935F)] font-medium">
                                <span>Discount</span>
                                <span>- Rs. {order.discount?.toLocaleString()}</span>
                              </div>
                            )}
                            {order.shipping > 0 && (
                              <div className="flex justify-between text-[var(--color-ink,#1F120F)]/70">
                                <span>Shipping</span>
                                <span>Rs. {order.shipping?.toLocaleString()}</span>
                              </div>
                            )}
                            {order.giftWrap > 0 && (
                              <div className="flex justify-between text-[var(--color-gold,#B8935F)] font-medium">
                                <span>Gift Wrap</span>
                                <span>Rs. {order.giftWrap?.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-[var(--color-gold,#B8935F)]/20 flex items-start gap-2 text-xs text-[var(--color-ink,#1F120F)]/70">
                          <MapPin size={14} className="text-[var(--color-gold,#B8935F)] shrink-0 mt-0.5" />
                          <span className="leading-snug">{order.address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
