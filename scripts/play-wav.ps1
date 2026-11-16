$AudioPath = $env:CP_RECORDED_AUDIO
$ErrorActionPreference = 'Stop'
try {
    $player = New-Object System.Media.SoundPlayer($AudioPath)
    $player.Load()
    [Console]::WriteLine('playing')
    $player.PlaySync()
    $player.Dispose()
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
