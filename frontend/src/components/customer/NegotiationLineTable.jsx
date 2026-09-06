import React from 'react';
import { MessageSquareText } from 'lucide-react';

export const NegotiationLineTable = ({ lines = [] }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-4 w-1/3 min-w-[200px]">
                Line
              </th>
              <th scope="col" className="py-3.5 pl-4 pr-6">
                Customer Comment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {lines.length === 0 ? (
              <tr>
                <td colSpan="2" className="py-8 text-center text-slate-500">
                  No negotiation lines found for this quotation.
                </td>
              </tr>
            ) : (
              lines.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 pl-6 pr-4 font-semibold text-slate-900 align-top">
                    {item.productName}
                  </td>
                  <td className="py-4 pl-4 pr-6 text-slate-700 align-top">
                    <div className="flex items-start gap-2 bg-slate-50/80 rounded-md p-3 border border-slate-200/80">
                      <MessageSquareText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-800 leading-relaxed">
                        {item.customerComment}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NegotiationLineTable;
