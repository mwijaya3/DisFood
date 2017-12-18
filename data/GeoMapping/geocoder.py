import geocoder
import csv
address = [];
latlong = [];
with open('address_concatenate.csv') as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',')
    for row in spamreader:
        address.append(row)
for i in range(len(address)):
    g = geocoder.google(str(address[i]))
    latlong.append([g.lat,g.lng])
with open("output.csv", "w",newline="") as f:
    writer = csv.writer(f)
    writer.writerows(latlong)
