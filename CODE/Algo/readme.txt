Approach Description

RadiusNeighborsClassifier is used to find the similarity between each county, and then make the Neighbors vote to decide the label of this county. Because the columns we use are kind of non independent therefore I use mahalanobis distance to measure the similarity. To avoid some outlier neigbors, we have a limited radius for them. The radius is the 1st percentile of the mahalanobis distances between each pair of counties.
In labels.csv, 'org' is computed by levelizing and according to the food insecurity rate from FeedingAmerica.com. The 'nodiz_lab' is compute from selective features, without disease features, while the 'diz_lab' is the same except take disease features into consideration.

K-means was used to cluster the regions according to food insecurity rate, obesity rate and diabetes rate. I make the cluster size=6 according to Elbow method. The cluster result is in 'cluster_label.csv'. The cluster centers are in 'cluster_center'. From the cluster centers, I find that those three features is kind of in the consistent trend, maybe we can have a better idea by visualization.


Usage & Required Software
- Download the dataset,'CensusCntOut.csv', 'FoodInsecurityRate.csv' and 'final.csv', along with the Script.py
- Simply compile the Script.py with Python2.7
- scikit-learn and pandas required

