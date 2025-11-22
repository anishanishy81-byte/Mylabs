import React, { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Search or select...",
  onAddNew,
  label,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option !== 'Add New' && 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const displayValue = value || searchTerm;

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="searchable-select" ref={wrapperRef}>
        <div className="searchable-select__wrapper">
          <input
            ref={inputRef}
            type="text"
            className="searchable-select__input"
            placeholder={placeholder}
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            required={required}
          />
          <button
            type="button"
            className="searchable-select__toggle"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="searchable-select__dropdown">
            {filteredOptions.length > 0 ? (
              <div className="searchable-select__options">
                {filteredOptions.map((option, index) => (
                  <div
                    key={option}
                    className={`searchable-select__option ${
                      index === highlightedIndex ? 'highlighted' : ''
                    } ${option === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {option}
                  </div>
                ))}
              </div>
            ) : (
              <div className="searchable-select__no-results">
                No results found for "{searchTerm}"
              </div>
            )}
            
            {onAddNew && (
              <div className="searchable-select__footer">
                <button
                  type="button"
                  className="searchable-select__add-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;