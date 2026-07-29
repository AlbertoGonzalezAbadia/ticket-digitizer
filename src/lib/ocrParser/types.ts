export interface ParsedField<T> {
  value: T | null
  confidence: 'high' | 'low'
}
