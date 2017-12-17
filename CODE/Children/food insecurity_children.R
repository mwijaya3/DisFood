# author: Luffina Huang
# date: 2017/11/27


library(AlgDesign)
library(lattice)
library(stats)    # ... for statistical operations
library(MASS)     # ... for Multivariate Normal Distribution
library(graphics) 

children_raw = read.csv('children.csv', header = TRUE)
#colnames(children_raw)[2:4]
children_raw$infant.mortality=children_raw$infant.mortality/100
children_raw$Child.and.teen.death.rate = children_raw$Child.and.teen.death.rate/100


# plot the relationship between children food insecurity and overweight and child-and-teen-death
par(mfrow=c(1,2))
for (i in colnames(children_raw)[3:4]) {
    predicted.intervals <- predict(lm(children_raw$household.food.insecurity ~ children_raw[[i]]),data.frame(x=children_raw[[i]]))
    plot(children_raw[[i]],children_raw$household.food.insecurity,col='deepskyblue4',ylab = "household food insecurity of children", xlab=i, main= paste("household food insecurity of children vs ", i), pch=16, cex.lab = 1.5)
    lines(children_raw[[i]],predicted.intervals,col='red',lwd=2)
}


#normalized the data
children_norm <- children_raw
for (i in colnames(children_norm)[2:4]) {
    children_norm[[i]]= ((children_norm[[i]]-mean(children_norm[[i]]))/sd(children_norm[[i]]))
}
# build the linear regression model
model = lm(household.food.insecurity ~ Child.and.teen.death.rate+overweight, data = children_norm)
summary(model)