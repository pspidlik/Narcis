# Vygeneruje PNG ikony appky (tmavé pozadí, žluté "N").
# Spuštění: powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\icons'
$sizes = @{ 'icon-192.png' = 192; 'icon-512.png' = 512; 'apple-touch-icon.png' = 180 }

foreach ($name in $sizes.Keys) {
  $s = $sizes[$name]
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b0b0d'))

  $font = New-Object System.Drawing.Font 'Segoe UI', ($s * 0.5), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#e8c547'))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $g.DrawString('N', $font, $brush, (New-Object System.Drawing.RectangleF 0, 0, $s, $s), $fmt)

  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  "Vytvoreno: $name ($s x $s)"
}
