import re,sys
v='01.00'
src=lambda n:open(f'src/{n}',encoding='utf-8').read()
core=src('core.js')+'\n'+src('nobet.js').replace('module.exports = NobetCore;','').replace("if (typeof module !== 'undefined') ",''); app=src('app1.js')+src('app2.js')+src('app4.js')+src('app5.js')+src('app3.js')
html=f'''<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HUSER ASHİ PLANLAMA v{v}</title>
<style>html,body{{margin:0;background:#f4f6f9}}\n{src('style.css')}</style>
<script>{src('xlsx-lib.js')}</script>
</head><body><div id="ap-app" class="ap-root"></div>
<script>\n{core}\n</script>
<script>\n{app}\n</script>
</body></html>'''
out=f'dist/HUSER ASHİ PLANLAMA v{v}.html'
open(out,'w',encoding='utf-8').write(html); print(out,len(html))
