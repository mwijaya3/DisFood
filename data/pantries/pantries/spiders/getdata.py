import csv
import itertools
import scrapy



class FoodPantries(scrapy.Item):
    name = scrapy.Field()
    streetAddress = scrapy.Field()
    city = scrapy.Field()
    zipcode = scrapy.Field()
    phone = scrapy.Field()
    state = scrapy.Field()

class FoodPantriesSpider(scrapy.Spider):
    name = "pantries"
    def start_requests(self):
        with open('georgia.csv') as csv_file:
            data = csv.reader(csv_file)
            scrapurls = []
            for row in data:
                scrapurls.append(row)
        scrapurls = itertools.chain.from_iterable(scrapurls)
        for url in scrapurls:
            yield scrapy.Request(url=url, callback=self.parse)

    def parse(self,response):
        num_item = len(response.xpath('//*[@id="content"]/div/div/div[1]/ul/script'))
        for i in range(num_item):
            item = FoodPantries()
            namehold = response.xpath('//*[@id="content"]/div/div/div[1]/ul/script['+ str(i+1)+']/text()').re("name.+[\"$]")
            if not namehold:
                namehold = 'Empty'
            else:
                namehold = ''.join(namehold)
            item['name'] = namehold
            streethold = response.xpath('//*[@id="content"]/div/div/div[1]/ul/script['+str(i+1)+']/text()').re("streetAddress...\\d+\\s+.+[\"$]")
            if not streethold:
                streethold = 'Empty'
            else:
                streethold = ''.join(streethold)
            item['streetAddress'] = streethold
            cityhold = response.xpath('//*[@id="content"]/div/div/div[1]/ul/script['+str(i+1)+']/text()').re("addressLocality...\\w+")
            if not cityhold:
                cityhold = 'Empty'
            else:
                cityhold = ''.join(cityhold)
            item['city'] = cityhold
            ziphold = response.xpath('//*[@id="content"]/div/div/div[1]/ul/script['+str(i+1)+']/text()').re("postalCode....\\d+")
            if not ziphold:
                ziphold = 'Empty'
            else:
                ziphold = ''.join(ziphold)
            item['zipcode'] = ziphold
            phonehold = response.xpath('//*[@id="content"]/div/div/div[1]/ul/script['+str(i+1)+']/text()').re("telephone.+[\"$]")
            if not phonehold:
                phonehold = 'Empty'
            else:
                phonehold = ''.join(phonehold)
            item['phone'] = phonehold
            item['state'] = 'Georgia'
            yield item
