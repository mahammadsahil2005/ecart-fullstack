$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET)) {
    $secretBytes = [byte[]]::new(48)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()

    try {
        $generator.GetBytes($secretBytes)
    }
    finally {
        $generator.Dispose()
    }

    $env:JWT_SECRET = [Convert]::ToBase64String($secretBytes)
}

& "$PSScriptRoot\mvnw.cmd" spring-boot:run
exit $LASTEXITCODE
