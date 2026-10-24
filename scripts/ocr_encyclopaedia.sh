#!/bin/bash
PDF='/mnt/user-data/uploads/2015_111273_Encyclopaedia-Of-Indian-Events-And-Dates.pdf'
cd /tmp/ocr/p
for i in $(seq 1 469); do
  n=$(printf "%03d" $i)
  [ -s $n.txt ] && continue
  pdftoppm -f $i -l $i -r 300 -gray -png "$PDF" t$n && tesseract t$n-*.png $n -l eng --psm 6 >/dev/null 2>&1
  rm -f t$n-*.png
done
echo done > /tmp/ocr/DONE
