Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(2, 6, 23))

$p1 = New-Object System.Drawing.Point 0, 0
$p2 = New-Object System.Drawing.Point 256, 256
$c1 = [System.Drawing.Color]::FromArgb(37, 99, 235)
$c2 = [System.Drawing.Color]::FromArgb(14, 165, 233)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($p1, $p2, $c1, $c2)
$g.FillEllipse($brush, 20, 20, 216, 216)

$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillEllipse($whiteBrush, 55, 55, 146, 120)

$tail = @(
    (New-Object System.Drawing.Point 75, 160),
    (New-Object System.Drawing.Point 55, 200),
    (New-Object System.Drawing.Point 115, 172)
)
$g.FillPolygon($whiteBrush, $tail)

$blueBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(37, 99, 235))
$g.FillEllipse($blueBrush, 85, 105, 18, 18)
$g.FillEllipse($blueBrush, 120, 105, 18, 18)
$g.FillEllipse($blueBrush, 155, 105, 18, 18)

$pngPath = Join-Path $PSScriptRoot "src\icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icoPath = Join-Path $PSScriptRoot "src\icon.ico"
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()

$bmp.Dispose()
$g.Dispose()
Write-Output "Saved PNG to $pngPath and ICO to $icoPath"
