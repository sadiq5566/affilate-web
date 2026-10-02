import { useState } from 'react';
import { admin } from '../api.js';
import { useToast } from './Toast.jsx';

function ImageInput({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const { url } = await admin('/upload', { method: 'POST', form });
      onChange(url);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }
  return (
    <div className="image-input">
      {value ? <img src={value} alt="" /> : <span className="image-input__empty">No image</span>}
      <div className="image-input__controls">
        <input type="url" placeholder="https://… image URL" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        <label className="btn btn--ghost btn--sm">
          {busy ? 'Uploading…' : 'Upload'}
          <input type="file" accept="image/*" hidden onChange={upload} />
        </label>
      </div>
    </div>
  );
}

export default function FormField({ field, value, onChange, options }) {
  const id = `f-${field.name}`;
  const common = { id, name: field.name, required: field.required, placeholder: field.placeholder };
  let input;
  switch (field.type) {
    case 'textarea':
      input = <textarea {...common} rows={field.rows || 3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'bool':
      return (
        <label className="check">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />
          <span>{field.label}</span>
          {field.help && <small>{field.help}</small>}
        </label>
      );
    case 'select':
      input = (
        <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {!field.required && <option value="">{field.emptyLabel || '— None —'}</option>}
          {field.required && value == null && <option value="">Select…</option>}
          {(options || field.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case 'image':
      input = <ImageInput value={value} onChange={onChange} />;
      break;
    case 'number':
      input = <input {...common} type="number" step={field.step || 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      input = <input {...common} type={field.type || 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className={`field ${field.full ? 'field--full' : ''}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span className="req"> *</span>}
      </label>
      {input}
      {field.help && <small>{field.help}</small>}
    </div>
  );
}
