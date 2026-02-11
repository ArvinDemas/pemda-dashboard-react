/**
 * Pagination Component
 * Accessible pagination with keyboard navigation
 * Following ui-ux-pro-max accessibility patterns
 */

import React from 'react';
import { CaretLeft, CaretRight } from 'phosphor-react';

const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    showPageNumbers = true,
    maxPageButtons = 5,
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage < maxPageButtons - 1) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        // Always show first page
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }

        // Show page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Always show last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages;
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page) => {
        if (typeof page === 'number' && page !== currentPage) {
            onPageChange(page);
        }
    };

    const pageNumbers = getPageNumbers();

    return (
        <nav
            className="pagination"
            role="navigation"
            aria-label="Pagination Navigation"
        >
            <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="pagination-btn pagination-prev"
                aria-label="Go to previous page"
                aria-disabled={currentPage === 1}
            >
                <CaretLeft size={16} weight="bold" />
                <span>Previous</span>
            </button>

            {showPageNumbers && (
                <div className="pagination-numbers" role="list">
                    {pageNumbers.map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span className="pagination-ellipsis" aria-hidden="true">
                                    ...
                                </span>
                            ) : (
                                <button
                                    onClick={() => handlePageClick(page)}
                                    className={`pagination-number ${page === currentPage ? 'active' : ''
                                        }`}
                                    aria-label={`Go to page ${page}`}
                                    aria-current={page === currentPage ? 'page' : undefined}
                                    role="listitem"
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="pagination-btn pagination-next"
                aria-label="Go to next page"
                aria-disabled={currentPage === totalPages}
            >
                <span>Next</span>
                <CaretRight size={16} weight="bold" />
            </button>
        </nav>
    );
};

export default Pagination;
