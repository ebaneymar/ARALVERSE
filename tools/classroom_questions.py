"""Add optional classroom clues to the shared editor, importer and original Excel template."""
import base64
import io
import re
import zipfile
from xml.etree import ElementTree as ET


def template_with_hints(encoded):
    namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    ET.register_namespace('x', namespace)
    tag = lambda name: f'{{{namespace}}}{name}'
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(encoded))) as original, zipfile.ZipFile(output, 'w') as updated:
        for entry in original.infolist():
            content = original.read(entry)
            if entry.filename == 'xl/worksheets/sheet1.xml':
                sheet = ET.fromstring(content)
                ET.SubElement(sheet.find(tag('cols')), tag('col'), min='7', max='7', width='48', customWidth='1')
                for row in sheet.find(tag('sheetData')):
                    number = row.attrib['r']
                    cell = ET.SubElement(row, tag('c'), r='G' + number, s='11' if number == '1' else '13')
                    if number == '1':
                        cell.set('t', 'str')
                        ET.SubElement(cell, tag('v')).text = 'Pahiwatig'
                content = ET.tostring(sheet, encoding='utf-8', xml_declaration=True)
            elif entry.filename == 'xl/worksheets/sheet2.xml':
                sheet = ET.fromstring(content)
                for address, message in {
                    'B13': 'Optional: enter a clue in Pahiwatig (up to 600 characters) for Pakainin ang mga Alaga.',
                    'B23': 'Sample clue: Basahin nang dahan-dahan ang bawat tunog sa salita.'
                }.items():
                    cell = sheet.find(f".//{tag('c')}[@r='{address}']")
                    cell.set('t', 'str')
                    ET.SubElement(cell, tag('v')).text = message
                content = ET.tostring(sheet, encoding='utf-8', xml_declaration=True)
            updated.writestr(entry, content)
    return base64.b64encode(output.getvalue()).decode('ascii')


def add_import_hints(source, once):
    template = re.search(r'const TEMPLATE="([A-Za-z0-9+/=]+)";', source)
    assert template, 'Shared Excel question template missing'
    source = source[:template.start(1)] + template_with_hints(template[1]) + source[template.end(1):]
    source = once(source, "const contextIndex=map.get('contextoptional')??map.get('context');",
                  "const contextIndex=map.get('contextoptional')??map.get('context');\n const hintIndex=map.get('pahiwatig')??map.get('pahiwatigoptional')??map.get('hint')??map.get('hintoptional');")
    source = once(source, 'map(k=>map.get(k)),contextIndex]', 'map(k=>map.get(k)),contextIndex,hintIndex]')
    return once(source, "correct:'ABC'.indexOf(correct),context:contextIndex",
                 "correct:'ABC'.indexOf(correct),hint:row.cells[hintIndex]?.value||'',context:contextIndex")


def add_editor_hints(source, once):
    source = once(source, "return {prompt,choices,correct,context,display:textHTML(context),explanation:''};",
                  """const hint=String(fields.hint||'').trim();
  if(hint.length>600)throw Error('Keep Pahiwatig within 600 characters.');
  return {prompt,choices,correct,context,hint,display:textHTML(context),explanation:''};""")
    source = once(source, 'if(row&&data.context===row.data.context)', "if(row&&!Object.hasOwn(fields,'hint'))data.hint=row.data.hint||'';\n  if(row&&data.context===row.data.context)")
    source = once(source, "answer:data.choices[data.correct],explanation:'',", "answer:data.choices[data.correct],hint:data.hint||'',explanation:'',")
    source = once(source, '<div class="avqe-form-actions"><button type="submit" id="avqeSave">',
                  '<div class="avqe-field"><label for="avqeHint">PAHIWATIG (optional)</label><textarea id="avqeHint" rows="2" maxlength="600" placeholder="A clue for the first retry in Pakainin ang mga Alaga"></textarea></div>\n<div class="avqe-form-actions"><button type="submit" id="avqeSave">')
    source = once(source, "context:$('avqeContext').value}}", "context:$('avqeContext').value,hint:$('avqeHint').value}}")
    source = once(source, "$('avqeContext').value=data.context||'';", "$('avqeContext').value=data.context||'';$('avqeHint').value=data.hint||'';")
    return once(source, 'if(row.fields.context){const context=', """if(row.fields.hint){const hint=document.createElement('p');hint.textContent='Pahiwatig: '+row.fields.hint;card.append(hint)}
    if(row.fields.context){const context=""")
