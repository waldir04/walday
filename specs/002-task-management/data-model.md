# Data Model: Task

## Task

- id: string (unique)
- title: string (required, non-empty)
- description: string (optional)
- priority: 'low' | 'medium' | 'high' (default 'medium')
- dueDate: string (optional, ISO date)
- estimatedDuration: string (optional, free-text e.g. "30 min", "1h")
- completed: boolean (default false)

## Validation

- title must be non-empty after trim.
- estimatedDuration, if provided, must be positive.