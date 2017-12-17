# -*- coding: utf-8 -*-
"""
Created on Thu Nov 23 17:12:27 2017

@author: YiHsuanHsieh
"""
import os
import csv
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.neighbors import RadiusNeighborsClassifier
from sklearn.metrics.pairwise import euclidean_distances
from sklearn.metrics.pairwise import pairwise_distances
from sklearn.covariance import EmpiricalCovariance


df_fir = pd.read_csv('FoodInsecurityRate.csv', index_col=[0,1])
df = pd.read_csv('final.csv', index_col=[0,1])
sel_attr = ['POP2010', 'OHU2010','PovertyRate', 'MedianFamilyIncome','LAPOP1_10', 'LAPOP05_10', 'LAPOP1_20', 'LALOWI1_10', 'LALOWI05_10', 'LALOWI1_20', 'lapophalf', 'lalowihalf','lahunvhalf','lasnaphalf','lapop1', 'lalowi1','lahunv1','lasnap1','lapop10','lalowi10','lahunv10','lasnap10', 'lapop20', 'lalowi20','lahunv20','lasnap20', 'TractLOWI','TractHUNV', 'TractSNAP']
df_fdattr = df.ix[:,sel_attr].copy()
disease = df.ix[:,['Percent_2010_ob', 'Percent_2010_dia']]
df_tractcnt = pd.read_csv('CensusCntOut.csv', index_col=[0,1])
df_fdattr = df_fdattr.join(df_tractcnt, how='inner')
tmp = df_fdattr.copy()

tmp.ix[:,'lapophalf'] = (tmp.ix[:,'lapophalf']-tmp.ix[:,'lapop1'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lapop1'] = (tmp.ix[:,'lapop1']-tmp.ix[:,'lapop10'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lapop10'] = (tmp.ix[:,'lapop10']-tmp.ix[:,'lapop20'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lapop20'] = tmp.ix[:,'lapop20']/tmp.ix[:,'POP2010']

tmp.ix[:,'lalowihalf'] = (tmp.ix[:,'lalowihalf']-tmp.ix[:,'lalowi1'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lalowi1'] = (tmp.ix[:,'lalowi1']-tmp.ix[:,'lalowi10'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lalowi10'] = (tmp.ix[:,'lalowi10']-tmp.ix[:,'lalowi20'])/tmp.ix[:,'POP2010']
tmp.ix[:,'lalowi20'] = tmp.ix[:,'lalowi20']/tmp.ix[:,'POP2010']

tmp.ix[:,'lahunvhalf'] = (tmp.ix[:,'lahunvhalf']-tmp.ix[:,'lahunv1'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lahunv1'] = (tmp.ix[:,'lahunv1']-tmp.ix[:,'lahunv10'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lahunv10'] = (tmp.ix[:,'lahunv10']-tmp.ix[:,'lahunv20'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lahunv20'] = tmp.ix[:,'lahunv20']/tmp.ix[:,'OHU2010']

tmp.ix[:,'lasnaphalf'] = (tmp.ix[:,'lasnaphalf']-tmp.ix[:,'lasnap1'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lasnap1'] = (tmp.ix[:,'lasnap1']-tmp.ix[:,'lasnap10'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lasnap10'] = (tmp.ix[:,'lasnap10']-tmp.ix[:,'lasnap20'])/tmp.ix[:,'OHU2010']
tmp.ix[:,'lasnap20'] = tmp.ix[:,'lasnap20']/tmp.ix[:,'OHU2010']

tmp.ix[:,'PovertyRate'] = tmp.ix[:,'PovertyRate']/(tmp.ix[:,'Cnt']*100.0)

tmp.ix[:,'TractLOWI'] = tmp.ix[:,'TractLOWI']/tmp.ix[:,'POP2010']
tmp.ix[:,'TractHUNV'] = tmp.ix[:,'TractHUNV']/tmp.ix[:,'OHU2010']
tmp.ix[:,'TractSNAP'] = tmp.ix[:,'TractSNAP']/tmp.ix[:,'OHU2010']
    
df_fdattr = tmp

lapop = pd.DataFrame(tmp.ix[:,'lapophalf']*0.5+tmp.ix[:,'lapop1']*1+tmp.ix[:,'lapop10']*10+tmp.ix[:,'lapop20']*20, columns=['lapop'])
lalowi = pd.DataFrame(tmp.ix[:,'lalowihalf']*0.5+tmp.ix[:,'lalowi1']*1+tmp.ix[:,'lalowi10']*10+tmp.ix[:,'lalowi20']*20,columns=['lalowi'])
lahunv = pd.DataFrame(tmp.ix[:,'lahunvhalf']*0.5+tmp.ix[:,'lahunv1']*1+tmp.ix[:,'lahunv10']*10+tmp.ix[:,'lahunv20']*20,columns=['lahunv'])
lasnap = pd.DataFrame(tmp.ix[:,'lasnaphalf']*0.5+tmp.ix[:,'lasnap1']*1+tmp.ix[:,'lasnap10']*10+tmp.ix[:,'lasnap20']*20,columns=['lasnap'])

#dist = lapop.join(lalowi)
#dist = dist.join(lahunv)
#dist = dist.join(lasnap)

exp_attr = ['PovertyRate', 'MedianFamilyIncome', 'lapophalf', 'lalowihalf','lahunvhalf','lasnaphalf','lapop1', 'lalowi1','lahunv1','lasnap1','lapop10','lalowi10','lahunv10','lasnap10', 'lapop20', 'lalowi20','lahunv20','lasnap20', 'TractLOWI','TractHUNV', 'TractSNAP']
#exp_attr = ['PovertyRate', 'MedianFamilyIncome' , 'TractLOWI','TractHUNV', 'TractSNAP']
X = df_fdattr.ix[:,exp_attr].copy()
DZ = X.join(disease) ##for Disease

std = np.std(X,axis=0)
mu = np.mean(X,axis=0)
X = (X-mu)/std

std = np.std(DZ,axis=0)
mu = np.mean(DZ,axis=0)
DZ = (DZ-mu)/std

b = [0.0,0.145,0.195,0.245,0.295,0.5]
label = pd.cut(df_fir['Food Insecurity Rate'], bins=b, labels=False)

#D = euclidean_distances(X, X)
D = pairwise_distances(X, metric='mahalanobis')
r = np.percentile(D,1)

neigh = RadiusNeighborsClassifier(radius=r,algorithm='auto', metric='mahalanobis', metric_params={'V': X.cov()})
neigh.fit(X, label) 
c = neigh.predict(X)
#A =neigh.radius_neighbors_graph(X)
wr=0
for i in range(len(label)):
    if label[i]==c[i]:
        wr+=1
print float(wr)/3139

#####Disease in######
DD = pairwise_distances(DZ, metric='mahalanobis')
r = np.percentile(DD,1)

neigh = RadiusNeighborsClassifier(radius=r,algorithm='auto', metric='mahalanobis', metric_params={'V': DZ.cov()})
neigh.fit(DZ, label)

d = neigh.predict(DZ)
wr=0
for i in range(len(label)):
    if label[i]==d[i]:
        wr+=1
print float(wr)/3139


all_lab = label.to_frame(name='org')
all_lab['nodiz_lab'] = pd.Series(c, index=all_lab.index)
all_lab['diz_lab'] = pd.Series(d, index=all_lab.index)
all_lab.to_csv(path_or_buf='labels.csv')
disease = disease.divide(100.0)
df_dis = df_fir.join(disease)

#for i in range(1,20):
#    disfood = KMeans(n_clusters=i, algorithm='full').fit(df_dis)
#    t.append(disfood.inertia_)
#plt.plot(range(1,20),t,'o-')
std = np.std(df_dis,axis=0)
mu = np.mean(df_dis,axis=0)
df_dis = (df_dis-mu)/std
disfood = KMeans(n_clusters=6, algorithm='full').fit(df_dis)
center = np.multiply(disfood.cluster_centers_, std.values)+mu.values

disfood_clust = pd.DataFrame(data=disfood.labels_, columns=['disfood'], index=df_dis.index)
disfood_center = pd.DataFrame(data=center, columns=['food insecurity rate', 'obesity rate', 'diabetes rate'])
disfood_center.to_csv(path_or_buf='cluster_center.csv')
disfood_clust.to_csv(path_or_buf='cluster_label.csv')
