import { type KeyboardEvent } from 'react'
import { Check } from '@phosphor-icons/react'

export interface QualityOption {
  label: string
  size: string
  available: boolean
  selected?: boolean
}

interface QualityChipProps {
  option: QualityOption
  selected: boolean
  focused: boolean
  onClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void
}

/**
 * QualityChip — Radio-style chip for video quality selection.
 *
 * States:
 * - Rest: transparent bg, subtle border
 * - Hover: subtle bg tint, darker border
 * - Selected: accent fill, white text, checkmark
 * - Focused: accent ring glow
 * - Disabled: greyed out, not-allowed cursor
 */
export default function QualityChip({
  option,
  selected,
  focused,
  onClick,
  onKeyDown,
}: QualityChipProps) {
  const isDisabled = !option.available

  /* ── Dynamic styles per state ── */
  const baseStyle: React.CSSProperties = {
    height: 'var(--chip-height)',
    minWidth: 'var(--chip-min-width)',
    borderRadius: 'var(--chip-radius)',
    padding: '0 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition:
      'background-color 150ms var(--ease-out), border-color 150ms var(--ease-out), color 150ms var(--ease-out), box-shadow 150ms var(--ease-out), transform 150ms var(--ease-spring)',
    userSelect: 'none',
    border: '1px solid transparent',
  }

  /* State overrides */
  if (isDisabled) {
    baseStyle.backgroundColor = 'var(--chip-bg-disabled)'
    baseStyle.borderColor = 'var(--gray-100)'
    baseStyle.color = 'var(--chip-text-disabled)'
    baseStyle.opacity = 0.5
  } else if (selected) {
    baseStyle.backgroundColor = 'var(--chip-bg-selected)'
    baseStyle.borderColor = 'var(--chip-border-selected)'
    baseStyle.color = 'var(--chip-text-selected)'
  } else {
    baseStyle.backgroundColor = 'var(--chip-bg-rest)'
    baseStyle.borderColor = 'var(--chip-border-rest)'
    baseStyle.color = 'var(--chip-text-rest)'
  }

  if (focused && !isDisabled) {
    baseStyle.boxShadow = 'var(--shadow-ring)'
    baseStyle.borderColor = 'var(--color-accent)'
  }

  return (
    <button
      onClick={() => {
        if (!isDisabled) onClick()
      }}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
      style={baseStyle}
      role="radio"
      aria-checked={selected}
      aria-label={`${option.label} — ${option.size}${!option.available ? ' (不可用)' : ''}`}
      onMouseEnter={(e) => {
        if (isDisabled || selected) return
        e.currentTarget.style.backgroundColor = 'var(--chip-bg-hover)'
        e.currentTarget.style.borderColor = 'var(--chip-border-hover)'
      }}
      onMouseLeave={(e) => {
        if (isDisabled || selected) return
        e.currentTarget.style.backgroundColor = 'var(--chip-bg-rest)'
        e.currentTarget.style.borderColor = 'var(--chip-border-rest)'
      }}
      onMouseDown={(e) => {
        if (isDisabled) return
        e.currentTarget.style.transform = 'scale(0.97)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Label row */}
      <span
        style={{
          fontSize: 'var(--text-body)',
          fontWeight: selected ? 500 : 400,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {selected && (
          <Check size={12} weight="bold" />
        )}
        {option.label}
      </span>

      {/* Estimated size row */}
      <span
        style={{
          fontSize: 'var(--text-caption)',
          lineHeight: 'var(--text-caption-lh)',
          opacity: selected ? 0.75 : 0.6,
        }}
      >
        {option.available ? option.size : '(无源)'}
      </span>
    </button>
  )
}
