---
applyTo: "**/*.cs"
---

# .NET Enterprise Service Standards

Apply these standards when writing, reviewing, or designing .NET C# enterprise services.

## Dependency injection

- All wiring belongs in the **composition root** (`Program.cs` or `Startup.cs`)
- Services must not resolve dependencies from `IServiceProvider` at runtime (service locator anti-pattern)
- Register services with the correct lifetime:
  - `AddSingleton` — stateless, thread-safe services
  - `AddScoped` — per-request state (web APIs, MediatR handlers)
  - `AddTransient` — cheap, stateless, short-lived services
- Never inject `IServiceProvider` into a business service

## BackgroundService workers

```csharp
public sealed class MyWorker : BackgroundService
{
    private readonly ILogger<MyWorker> _logger;

    public MyWorker(ILogger<MyWorker> logger) => _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DoWorkAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected on shutdown — do not log as error
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker iteration failed");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }
}
```

- Register with `services.AddHostedService<MyWorker>()`
- Handle `OperationCanceledException` gracefully at the loop boundary
- Apply back-off on repeated failures to avoid a tight error loop

## Kafka consumers (Confluent.Kafka)

- Set `EnableAutoCommit = false` — commit offsets manually after successful processing
- Handle duplicate delivery — consumers must be idempotent
- Route poison messages to a dead-letter topic after exhausting retries
- Do not call `consumer.Consume()` inside a lock
- Use a dedicated consumer group per service

```csharp
var result = consumer.Consume(stoppingToken);
try
{
    await ProcessAsync(result.Message, stoppingToken);
    consumer.Commit(result);
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    await SendToDeadLetterAsync(result.Message, ex, stoppingToken);
    consumer.Commit(result);
}
```

## Async correctness

- `async void` is forbidden except for event handlers
- Never use `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()`
- Propagate `CancellationToken` through every async call
- Only mark a method `async` if it contains an `await`

## SOLID applied to composition roots

- **S** — Each class has one reason to change; split by domain responsibility, not technical layer
- **O** — Extend via new implementations, not by modifying existing ones; use strategy/decorator patterns
- **L** — Derived types must honour the contracts of their base types
- **I** — Prefer narrow, client-specific interfaces over fat interfaces
- **D** — Depend on abstractions (`IOrderRepository`) not concrete implementations (`SqlOrderRepository`)

## Distributed systems guards

- **Idempotency**: Every operation that can be retried must produce the same outcome on repeat calls
- **Timeouts**: Set explicit `HttpClient` timeouts and `CancellationToken` deadlines — never rely on defaults
- **Circuit breakers**: Use Polly for transient fault handling on outbound HTTP and database calls
- **Outbox pattern**: For reliable event publishing alongside database writes, use the transactional outbox pattern — never publish events directly inside a database transaction
- **Correlation IDs**: Propagate a correlation ID (`X-Correlation-Id`) through all service calls for distributed tracing

## KISS over abstraction

Before adding a new abstraction, ask:
1. Does this solve a real problem I have now, not one I might have later?
2. Does this make the code easier or harder to read?
3. Can I delete this later without a major refactor?

If the answer to any of these is unfavourable, keep it simple.
