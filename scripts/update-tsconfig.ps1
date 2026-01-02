$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\tsconfig.json'
$json = Get-Content -Raw -Path $path | ConvertFrom-Json
if (-not $json.compilerOptions) {
  $json | Add-Member -MemberType NoteProperty -Name compilerOptions -Value (@{})
}
$co = $json.compilerOptions
$co.declaration = $true
$co.sourceMap = $true
$co.baseUrl = '.'
if (-not $co.paths) { $co | Add-Member -MemberType NoteProperty -Name paths -Value (@{}) }
$co.paths.'@config/*' = @('src/config/*')
$co.paths.'@utils/*' = @('src/utils/*')
$co.paths.'@api/*' = @('src/api/*')
$co.paths.'@services/*' = @('src/services/*')
$co.paths.'@types/*' = @('src/types/*')
$co.paths.'@modules/*' = @('src/modules/*')

$json | ConvertTo-Json -Depth 32 | Set-Content -Encoding UTF8 -Path $path
Write-Output 'tsconfig.json updated'
