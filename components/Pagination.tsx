"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 0) return null;

  const pageNumbers = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 select-none"
    >
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={`
          inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${
            currentPage <= 1
              ? "text-gray-300 cursor-not-allowed bg-transparent"
              : "text-gray-700 hover:bg-gray-100 cursor-pointer bg-white border border-gray-300"
          }
        `}
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Prev
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex items-center justify-center w-9 h-9 text-sm text-gray-500"
                aria-hidden="true"
              >
                &hellip;
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? "page" : undefined}
              className={`
                inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-blue-600 text-white border border-blue-600 cursor-default"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 cursor-pointer"
                }
              `}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className={`
          inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${
            currentPage >= totalPages
              ? "text-gray-300 cursor-not-allowed bg-transparent"
              : "text-gray-700 hover:bg-gray-100 cursor-pointer bg-white border border-gray-300"
          }
        `}
      >
        Next
        <svg
          className="w-4 h-4 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  );
}

export default Pagination;
