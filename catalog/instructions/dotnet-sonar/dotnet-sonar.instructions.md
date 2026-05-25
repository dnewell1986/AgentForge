---
applyTo: "**/*.cs"
---

# .NET SonarC# Coding Standards

Follow these rules for all C# code. These enforce the SonarC# (Sonar Way) quality profile.

## Naming conventions

- **Types** (classes, structs, interfaces, enums, delegates): `PascalCase`
- **Interfaces**: prefix with `I` — `IUserRepository`
- **Methods and properties**: `PascalCase`
- **Constants and static readonly fields**: `PascalCase`
- **Private instance fields**: `_camelCase`
- **Local variables and parameters**: `camelCase`
- **Async methods**: suffix with `Async` — `GetUserAsync`
- **Boolean members**: use affirmative names — `IsActive`, `HasPermission`, not `NotDeleted`

## Complexity limits

- **Cyclomatic complexity**: max 10 per method
- **Cognitive complexity**: max 15 per method
- **Method length**: max 60 lines; extract sub-operations into well-named private methods
- **Class length**: max 400 lines; split by responsibility if exceeded

## Null safety

- Enable nullable reference types: `<Nullable>enable</Nullable>` in the project file
- Do not use `null!` (null-forgiving) without a code comment explaining why it is safe
- Prefer `?.` and `??` over explicit null checks where they improve readability
- Validate method parameters at public API boundaries using guard clauses at the top of the method

```csharp
// Good
public void Process(string input)
{
    ArgumentNullException.ThrowIfNull(input);
    // ...
}
```

## Exception handling

- Catch specific exception types — never bare `catch (Exception)` unless re-throwing or at a top-level boundary
- Never swallow exceptions silently (empty catch blocks are forbidden)
- Use `ILogger<T>` for exception logging — no `Console.Write` or `Debug.Write` in production code
- Do not use exceptions for control flow

```csharp
// Bad — exception as control flow
try { return int.Parse(input); } catch { return 0; }

// Good
return int.TryParse(input, out var value) ? value : 0;
```

## Async patterns

- `async void` is forbidden except for event handlers
- Never block on async code: `.Result`, `.Wait()`, and `.GetAwaiter().GetResult()` are forbidden
- Accept and forward `CancellationToken` through the entire call chain
- Use `ConfigureAwait(false)` in library code (not required in ASP.NET Core application code)
- Mark methods `async` only when they contain an `await`

```csharp
// Good
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    return await _repository.FindAsync(id, cancellationToken);
}
```

## Code hygiene

- Remove all unused `using` directives
- Remove all unused variables, parameters, and private members
- No commented-out code — delete it; history is in source control
- No magic numbers or strings — use named constants or enums
- Use `var` when the type is obvious from the right-hand side; spell it out otherwise
- Prefer `is` pattern matching over explicit type casts

```csharp
// Good
if (shape is Circle { Radius: > 0 } circle)
{
    // ...
}
```

## IDisposable

- Implement `IDisposable` on any class that holds unmanaged resources or owns `IDisposable` fields
- Use `using` declarations or `using` statements for all `IDisposable` instances
- Never rely on finalizers for resource cleanup in application code
