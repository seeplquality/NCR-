import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function JobSearchSelect({
  orders = [],
  selectedJobNo = '',
  onSelectJobNo,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter orders by Job No or Project
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (order.wo && order.wo.toLowerCase().includes(q)) ||
      (order.project && order.project.toLowerCase().includes(q))
    );
  });

  const selectedOrder = orders.find((o) => o.wo === selectedJobNo);

  const handleSelect = (wo) => {
    onSelectJobNo(wo);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelectJobNo('');
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-lg text-left text-sm transition-all shadow-sm ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-100'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {selectedJobNo ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">
                {selectedJobNo}
              </span>
              {selectedOrder?.project && (
                <span className="text-xs text-slate-500 truncate hidden sm:inline">
                  • {selectedOrder.project}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Search or select Job No (WO:NO)...</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedJobNo && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type Job No or Client name..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
              <span>Matching: {filteredOrders.length} orders</span>
              {orders.length > 0 && <span>Total: {orders.length}</span>}
            </div>
          </div>

          {/* List Results */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const isSelected = order.wo === selectedJobNo;
                return (
                  <button
                    key={order.wo}
                    type="button"
                    onClick={() => handleSelect(order.wo)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        <span>{order.wo}</span>
                        {order.panels && order.panels.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-normal">
                            {order.panels.length} {order.panels.length === 1 ? 'panel' : 'panels'}
                          </span>
                        )}
                      </div>
                      {order.project && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {order.project}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm px-4">
                No matching Work Orders found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
