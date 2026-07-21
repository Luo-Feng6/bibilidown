import type React from 'react'

function InputField({
  label,
  type,
  placeholder,
  value,
  onChange,
  onKeyDown,
  id,
}: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  id?: string
}) {
  return (
    <div>
      <label
        className="block mb-1t"
        style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="w-full"
        style={{
          height: 'var(--input-height)',
          padding: '0 12px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-default)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-body)',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--input-border-focus)'
          e.currentTarget.style.boxShadow = 'var(--input-ring-focus)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

export default InputField
